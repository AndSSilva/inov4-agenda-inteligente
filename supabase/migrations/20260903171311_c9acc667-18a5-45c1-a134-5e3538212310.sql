CREATE TYPE public.status_agendamento AS ENUM ('pendente','confirmado','cancelado','concluido');

CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  hora_inicio time NOT NULL DEFAULT '09:00',
  hora_fim time NOT NULL DEFAULT '18:00',
  dias_semana smallint[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.empresas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresas leitura publica" ON public.empresas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dono insere empresa" ON public.empresas FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "dono atualiza empresa" ON public.empresas FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "dono remove empresa" ON public.empresas FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.eh_dono(_empresa uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = _empresa AND e.owner_id = auth.uid());
$$;

CREATE TABLE public.servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  duracao_min integer NOT NULL DEFAULT 30,
  preco numeric(10,2) NOT NULL DEFAULT 0,
  intervalo_min integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX servicos_empresa_idx ON public.servicos(empresa_id);
GRANT SELECT ON public.servicos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicos TO authenticated;
GRANT ALL ON public.servicos TO service_role;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servicos ativos publicos" ON public.servicos FOR SELECT TO anon USING (ativo);
CREATE POLICY "dono le servicos" ON public.servicos FOR SELECT TO authenticated USING (ativo OR public.eh_dono(empresa_id));
CREATE POLICY "dono gerencia servicos ins" ON public.servicos FOR INSERT TO authenticated WITH CHECK (public.eh_dono(empresa_id));
CREATE POLICY "dono gerencia servicos upd" ON public.servicos FOR UPDATE TO authenticated USING (public.eh_dono(empresa_id)) WITH CHECK (public.eh_dono(empresa_id));
CREATE POLICY "dono gerencia servicos del" ON public.servicos FOR DELETE TO authenticated USING (public.eh_dono(empresa_id));

CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  filiacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX clientes_empresa_telefone_idx ON public.clientes(empresa_id, telefone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dono le clientes" ON public.clientes FOR SELECT TO authenticated USING (public.eh_dono(empresa_id));
CREATE POLICY "dono insere clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (public.eh_dono(empresa_id));
CREATE POLICY "dono atualiza clientes" ON public.clientes FOR UPDATE TO authenticated USING (public.eh_dono(empresa_id)) WITH CHECK (public.eh_dono(empresa_id));
CREATE POLICY "dono remove clientes" ON public.clientes FOR DELETE TO authenticated USING (public.eh_dono(empresa_id));

CREATE TABLE public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  servico_id uuid NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  status public.status_agendamento NOT NULL DEFAULT 'pendente',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agendamentos_empresa_inicio_idx ON public.agendamentos(empresa_id, inicio);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamentos TO authenticated;
GRANT ALL ON public.agendamentos TO service_role;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dono le agendamentos" ON public.agendamentos FOR SELECT TO authenticated USING (public.eh_dono(empresa_id));
CREATE POLICY "dono insere agendamentos" ON public.agendamentos FOR INSERT TO authenticated WITH CHECK (public.eh_dono(empresa_id));
CREATE POLICY "dono atualiza agendamentos" ON public.agendamentos FOR UPDATE TO authenticated USING (public.eh_dono(empresa_id)) WITH CHECK (public.eh_dono(empresa_id));
CREATE POLICY "dono remove agendamentos" ON public.agendamentos FOR DELETE TO authenticated USING (public.eh_dono(empresa_id));

CREATE OR REPLACE FUNCTION public.horarios_ocupados(p_empresa uuid, p_data date)
RETURNS TABLE (inicio timestamptz, fim timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.inicio, a.fim
  FROM public.agendamentos a
  WHERE a.empresa_id = p_empresa
    AND a.status <> 'cancelado'
    AND (a.inicio AT TIME ZONE 'America/Sao_Paulo')::date = p_data;
$$;
GRANT EXECUTE ON FUNCTION public.horarios_ocupados(uuid, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.criar_agendamento(
  p_slug text,
  p_servico uuid,
  p_inicio timestamptz,
  p_nome text,
  p_telefone text,
  p_email text DEFAULT NULL,
  p_filiacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa uuid;
  v_duracao integer;
  v_fim timestamptz;
  v_cliente uuid;
  v_id uuid;
BEGIN
  IF length(trim(coalesce(p_nome,''))) < 2 THEN RAISE EXCEPTION 'Nome inválido'; END IF;
  IF length(regexp_replace(coalesce(p_telefone,''), '\D', '', 'g')) < 10 THEN RAISE EXCEPTION 'Telefone inválido'; END IF;

  SELECT e.id INTO v_empresa FROM public.empresas e WHERE e.slug = p_slug;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Empresa não encontrada'; END IF;

  SELECT s.duracao_min INTO v_duracao FROM public.servicos s
    WHERE s.id = p_servico AND s.empresa_id = v_empresa AND s.ativo;
  IF v_duracao IS NULL THEN RAISE EXCEPTION 'Serviço indisponível'; END IF;

  v_fim := p_inicio + make_interval(mins => v_duracao);

  IF EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.empresa_id = v_empresa AND a.status <> 'cancelado'
      AND a.inicio < v_fim AND a.fim > p_inicio
  ) THEN
    RAISE EXCEPTION 'Horário já reservado';
  END IF;

  INSERT INTO public.clientes (empresa_id, nome, telefone, email, filiacao)
  VALUES (v_empresa, trim(p_nome), trim(p_telefone), nullif(trim(coalesce(p_email,'')),''), nullif(trim(coalesce(p_filiacao,'')),''))
  ON CONFLICT (empresa_id, telefone) DO UPDATE
    SET nome = EXCLUDED.nome,
        email = COALESCE(EXCLUDED.email, public.clientes.email),
        filiacao = COALESCE(EXCLUDED.filiacao, public.clientes.filiacao)
  RETURNING id INTO v_cliente;

  INSERT INTO public.agendamentos (empresa_id, cliente_id, servico_id, inicio, fim, status)
  VALUES (v_empresa, v_cliente, p_servico, p_inicio, v_fim, 'pendente')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.criar_agendamento(text, uuid, timestamptz, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.provisionar_empresa()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_slug text;
  v_s1 uuid; v_s2 uuid; v_s3 uuid;
  v_c1 uuid; v_c2 uuid; v_c3 uuid;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT id INTO v_empresa FROM public.empresas WHERE owner_id = v_uid LIMIT 1;
  IF v_empresa IS NOT NULL THEN RETURN v_empresa; END IF;

  v_slug := 'negocio-' || substr(replace(v_uid::text, '-', ''), 1, 8);
  INSERT INTO public.empresas (owner_id, nome, slug) VALUES (v_uid, 'Meu Negócio', v_slug) RETURNING id INTO v_empresa;

  INSERT INTO public.servicos (empresa_id, nome, duracao_min, preco, intervalo_min)
  VALUES (v_empresa, 'Banho completo', 45, 90, 15) RETURNING id INTO v_s1;
  INSERT INTO public.servicos (empresa_id, nome, duracao_min, preco, intervalo_min)
  VALUES (v_empresa, 'Corte higiênico', 60, 120, 15) RETURNING id INTO v_s2;
  INSERT INTO public.servicos (empresa_id, nome, duracao_min, preco, intervalo_min)
  VALUES (v_empresa, 'Tosa na patinha', 20, 40, 10) RETURNING id INTO v_s3;

  INSERT INTO public.clientes (empresa_id, nome, telefone, email, filiacao)
  VALUES (v_empresa, 'Camila Rocha', '(11) 98822-3410', 'camila@exemplo.com', 'Bisco · dachshund') RETURNING id INTO v_c1;
  INSERT INTO public.clientes (empresa_id, nome, telefone, email, filiacao)
  VALUES (v_empresa, 'Rafael Nunes', '(11) 97640-1188', 'rafael@exemplo.com', 'Simba · gatinho') RETURNING id INTO v_c2;
  INSERT INTO public.clientes (empresa_id, nome, telefone, email, filiacao)
  VALUES (v_empresa, 'Juliana Prado', '(11) 99315-7742', NULL, 'Aurora · golden') RETURNING id INTO v_c3;

  INSERT INTO public.agendamentos (empresa_id, cliente_id, servico_id, inicio, fim, status) VALUES
    (v_empresa, v_c1, v_s1, ((v_hoje || ' 09:00')::timestamp AT TIME ZONE 'America/Sao_Paulo'), ((v_hoje || ' 09:45')::timestamp AT TIME ZONE 'America/Sao_Paulo'), 'pendente'),
    (v_empresa, v_c2, v_s2, ((v_hoje || ' 10:30')::timestamp AT TIME ZONE 'America/Sao_Paulo'), ((v_hoje || ' 11:30')::timestamp AT TIME ZONE 'America/Sao_Paulo'), 'confirmado'),
    (v_empresa, v_c3, v_s3, ((v_hoje || ' 14:00')::timestamp AT TIME ZONE 'America/Sao_Paulo'), ((v_hoje || ' 14:20')::timestamp AT TIME ZONE 'America/Sao_Paulo'), 'confirmado'),
    (v_empresa, v_c1, v_s2, (((v_hoje + 1) || ' 15:00')::timestamp AT TIME ZONE 'America/Sao_Paulo'), (((v_hoje + 1) || ' 16:00')::timestamp AT TIME ZONE 'America/Sao_Paulo'), 'pendente');

  RETURN v_empresa;
END;
$$;
GRANT EXECUTE ON FUNCTION public.provisionar_empresa() TO authenticated;

INSERT INTO public.empresas (id, owner_id, nome, slug, hora_inicio, hora_fim)
VALUES ('11111111-1111-1111-1111-111111111111', NULL, 'Açaí Pet', 'acai-pet', '09:00', '18:00');

INSERT INTO public.servicos (id, empresa_id, nome, duracao_min, preco, intervalo_min) VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Banho completo', 45, 90, 15),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Corte higiênico', 60, 120, 15),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Tosa na patinha', 20, 40, 10);

INSERT INTO public.clientes (id, empresa_id, nome, telefone, email, filiacao) VALUES
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'Camila Rocha', '(11) 98822-3410', 'camila@exemplo.com', 'Bisco · dachshund'),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'Rafael Nunes', '(11) 97640-1188', NULL, 'Simba · gatinho');

INSERT INTO public.agendamentos (empresa_id, cliente_id, servico_id, inicio, fim, status) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', ((((now() AT TIME ZONE 'America/Sao_Paulo')::date) || ' 09:00')::timestamp AT TIME ZONE 'America/Sao_Paulo'), ((((now() AT TIME ZONE 'America/Sao_Paulo')::date) || ' 09:45')::timestamp AT TIME ZONE 'America/Sao_Paulo'), 'confirmado'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', ((((now() AT TIME ZONE 'America/Sao_Paulo')::date) || ' 13:00')::timestamp AT TIME ZONE 'America/Sao_Paulo'), ((((now() AT TIME ZONE 'America/Sao_Paulo')::date) || ' 14:00')::timestamp AT TIME ZONE 'America/Sao_Paulo'), 'pendente');
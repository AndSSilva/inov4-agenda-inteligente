-- =========================================================================
-- Configurações extras da agenda: intervalo (almoço), atendimento em
-- feriados, e bloqueios manuais de dia/horário (folga, cliente que precisa
-- de mais tempo, etc.)
-- =========================================================================

ALTER TABLE public.empresas
  ADD COLUMN intervalo_inicio text,
  ADD COLUMN intervalo_fim text,
  ADD COLUMN atender_feriados boolean NOT NULL DEFAULT false;

CREATE TABLE public.bloqueios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bloqueios_periodo_valido CHECK (fim > inicio)
);

GRANT SELECT ON TABLE public.bloqueios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bloqueios TO authenticated;
GRANT ALL ON TABLE public.bloqueios TO service_role;

ALTER TABLE public.bloqueios ENABLE ROW LEVEL SECURITY;

-- Admin/master gerenciam os bloqueios da própria empresa (eh_dono já cobre
-- master também, ver migração do admin master).
CREATE POLICY "admin gerencia bloqueios" ON public.bloqueios
  FOR ALL TO authenticated
  USING (public.eh_dono(empresa_id))
  WITH CHECK (public.eh_dono(empresa_id));

-- Visitante da agenda pública precisa enxergar os bloqueios pra não ofertar
-- esses horários — só de empresas ativas, e só o período (sem exigir
-- EXECUTE numa function, checagem direta na tabela).
CREATE POLICY "visitantes leem bloqueios de empresas ativas" ON public.bloqueios
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = bloqueios.empresa_id AND e.ativa));

CREATE INDEX bloqueios_empresa_periodo_idx ON public.bloqueios (empresa_id, inicio, fim);

-- criar_agendamento passa a rejeitar também horários que caiam dentro de um
-- bloqueio manual (mesma lógica de conflito já usada contra agendamentos).
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

  IF EXISTS (
    SELECT 1 FROM public.bloqueios b
    WHERE b.empresa_id = v_empresa
      AND b.inicio < v_fim AND b.fim > p_inicio
  ) THEN
    RAISE EXCEPTION 'Horário bloqueado';
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
GRANT EXECUTE ON FUNCTION public.criar_agendamento(text, uuid, timestamptz, text, text, text, text) TO anon, service_role;

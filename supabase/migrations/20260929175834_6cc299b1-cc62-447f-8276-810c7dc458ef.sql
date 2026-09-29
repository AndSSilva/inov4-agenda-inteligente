ALTER TABLE public.clientes
  ADD COLUMN pet_tipo public.tipo_pet,
  ADD COLUMN pet_raca text;

ALTER TABLE public.atendimentos
  ADD COLUMN pet_raca text;

ALTER TABLE public.pets
  ADD COLUMN raca text;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_pet_raca_tamanho CHECK (pet_raca IS NULL OR char_length(pet_raca) <= 80);

ALTER TABLE public.atendimentos
  ADD CONSTRAINT atendimentos_pet_raca_tamanho CHECK (pet_raca IS NULL OR char_length(pet_raca) <= 80);

ALTER TABLE public.pets
  ADD CONSTRAINT pets_raca_tamanho CHECK (raca IS NULL OR char_length(raca) <= 80);

DROP FUNCTION IF EXISTS public.criar_agendamento(text, uuid, timestamptz, text, text, text, text);

CREATE FUNCTION public.criar_agendamento(
  p_slug text,
  p_servico uuid,
  p_inicio timestamptz,
  p_nome text,
  p_telefone text,
  p_email text DEFAULT NULL,
  p_filiacao text DEFAULT NULL,
  p_pet_tipo public.tipo_pet DEFAULT NULL,
  p_pet_raca text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa uuid;
  v_duracao integer;
  v_fim timestamptz;
  v_cliente uuid;
  v_id uuid;
BEGIN
  IF length(trim(coalesce(p_nome,''))) < 2 OR length(trim(coalesce(p_nome,''))) > 100 THEN
    RAISE EXCEPTION 'Nome inválido';
  END IF;
  IF length(regexp_replace(coalesce(p_telefone,''), '\D', '', 'g')) NOT IN (10, 11) THEN
    RAISE EXCEPTION 'Telefone inválido';
  END IF;
  IF p_email IS NOT NULL AND length(trim(p_email)) > 255 THEN
    RAISE EXCEPTION 'E-mail inválido';
  END IF;
  IF length(trim(coalesce(p_filiacao,''))) < 1 OR length(trim(coalesce(p_filiacao,''))) > 120 THEN
    RAISE EXCEPTION 'Nome do pet inválido';
  END IF;
  IF p_pet_tipo IS NULL OR p_pet_tipo NOT IN ('cachorro'::public.tipo_pet, 'gato'::public.tipo_pet, 'outro'::public.tipo_pet) THEN
    RAISE EXCEPTION 'Tipo do pet inválido';
  END IF;
  IF length(trim(coalesce(p_pet_raca,''))) > 80 THEN
    RAISE EXCEPTION 'Raça inválida';
  END IF;

  SELECT e.id INTO v_empresa
  FROM public.empresas e
  WHERE e.slug = p_slug AND e.ativa;
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

  INSERT INTO public.clientes (empresa_id, nome, telefone, email, filiacao, pet_tipo, pet_raca)
  VALUES (
    v_empresa,
    trim(p_nome),
    trim(p_telefone),
    nullif(trim(coalesce(p_email,'')),''),
    nullif(trim(coalesce(p_filiacao,'')),''),
    p_pet_tipo,
    nullif(trim(coalesce(p_pet_raca,'')),'')
  )
  ON CONFLICT (empresa_id, telefone) DO UPDATE
    SET nome = EXCLUDED.nome,
        email = COALESCE(EXCLUDED.email, public.clientes.email),
        filiacao = COALESCE(EXCLUDED.filiacao, public.clientes.filiacao),
        pet_tipo = EXCLUDED.pet_tipo,
        pet_raca = EXCLUDED.pet_raca
  RETURNING id INTO v_cliente;

  INSERT INTO public.agendamentos (empresa_id, cliente_id, servico_id, inicio, fim, status)
  VALUES (v_empresa, v_cliente, p_servico, p_inicio, v_fim, 'pendente')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_agendamento(text, uuid, timestamptz, text, text, text, text, public.tipo_pet, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_agendamento(text, uuid, timestamptz, text, text, text, text, public.tipo_pet, text) TO anon, service_role;
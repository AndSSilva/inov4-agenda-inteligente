ALTER TABLE public.agendamentos ADD COLUMN preco_previsto numeric(12,2);

UPDATE public.agendamentos a
SET preco_previsto = s.preco
FROM public.servicos s
WHERE s.id = a.servico_id;

ALTER TABLE public.agendamentos ALTER COLUMN preco_previsto SET NOT NULL;
ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_preco_previsto_nao_negativo CHECK (preco_previsto >= 0);

CREATE OR REPLACE FUNCTION public.registrar_preco_previsto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT preco INTO NEW.preco_previsto
  FROM public.servicos
  WHERE id = NEW.servico_id AND empresa_id = NEW.empresa_id;
  IF NEW.preco_previsto IS NULL THEN
    RAISE EXCEPTION 'Serviço indisponível para esta empresa';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER agendamentos_registrar_preco_previsto
BEFORE INSERT OR UPDATE OF servico_id, empresa_id ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.registrar_preco_previsto();

ALTER TABLE public.atendimentos ADD COLUMN valor_real numeric(12,2);
ALTER TABLE public.atendimentos ADD CONSTRAINT atendimentos_valor_real_nao_negativo CHECK (valor_real IS NULL OR valor_real >= 0);
ALTER TABLE public.atendimentos ADD CONSTRAINT atendimentos_pagamento_exige_valor_real CHECK (NOT pagamento_confirmado OR valor_real IS NOT NULL);
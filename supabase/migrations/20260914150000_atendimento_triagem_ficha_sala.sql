-- =========================================================================
-- Aba "Atendimento": triagem -> ficha de atendimento -> sala (checkout).
-- =========================================================================

CREATE TYPE public.etapa_atendimento AS ENUM ('em_atendimento', 'finalizado');
CREATE TYPE public.tipo_pet AS ENUM ('cachorro', 'gato', 'ave', 'roedor', 'reptil', 'outro');
CREATE TYPE public.sexo_pet AS ENUM ('macho', 'femea');
CREATE TYPE public.temperamento_pet AS ENUM ('manso', 'bravo');

CREATE TABLE public.atendimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NOT NULL UNIQUE REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  etapa public.etapa_atendimento NOT NULL DEFAULT 'em_atendimento',
  foto_url text,
  pet_nome text NOT NULL DEFAULT '',
  pet_tipo public.tipo_pet,
  sexo public.sexo_pet,
  nascimento date,
  peso numeric(6, 2),
  cadastrado boolean NOT NULL DEFAULT false,
  temperamento public.temperamento_pet,
  observacao text,
  pagamento_confirmado boolean NOT NULL DEFAULT false,
  pagamento_confirmado_em timestamptz,
  entrega_confirmada boolean NOT NULL DEFAULT false,
  entrega_confirmada_em timestamptz,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Regra de negócio garantida no banco: nunca confirma entrega sem pagamento.
  CONSTRAINT entrega_exige_pagamento CHECK (NOT entrega_confirmada OR pagamento_confirmado)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.atendimentos TO authenticated;
GRANT ALL ON TABLE public.atendimentos TO service_role;

ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin gerencia atendimentos" ON public.atendimentos
  FOR ALL TO authenticated
  USING (public.eh_dono(empresa_id))
  WITH CHECK (public.eh_dono(empresa_id));

CREATE INDEX atendimentos_empresa_etapa_idx ON public.atendimentos (empresa_id, etapa);

-- Fotos do pet, isoladas por empresa via prefixo do caminho (empresa_id/...).
INSERT INTO storage.buckets (id, name, public)
VALUES ('atendimento-fotos', 'atendimento-fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin gerencia fotos de atendimento" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'atendimento-fotos'
    AND ((storage.foldername(name))[1] = (public.empresa_do_admin(auth.uid()))::text OR public.is_master(auth.uid()))
  )
  WITH CHECK (
    bucket_id = 'atendimento-fotos'
    AND ((storage.foldername(name))[1] = (public.empresa_do_admin(auth.uid()))::text OR public.is_master(auth.uid()))
  );

CREATE POLICY "leitura publica fotos atendimento" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'atendimento-fotos');

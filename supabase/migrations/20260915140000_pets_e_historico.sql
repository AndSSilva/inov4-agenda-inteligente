-- =========================================================================
-- Perfil de pet reutilizável entre visitas (identificado pelo cliente, que
-- por sua vez já é identificado pelo telefone). "atendimentos" continua
-- guardando o retrato de cada visita (peso do dia, observação daquela
-- visita); "pets" guarda o perfil atual/canônico do animal.
--
-- Não faço backfill de "pets" a partir de atendimentos já finalizados: não
-- há como saber, com os dados que já existem, se duas fichas antigas do
-- mesmo telefone eram do mesmo animal ou de dois animais diferentes — essa
-- é exatamente a ambiguidade que esta funcionalidade resolve daqui pra
-- frente. Fichas antigas continuam aparecendo no Histórico normalmente,
-- só não ficam vinculadas a um "pets.id".
-- =========================================================================

CREATE TABLE public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  tipo public.tipo_pet,
  sexo public.sexo_pet,
  nascimento date,
  peso numeric(6, 2),
  cadastrado boolean NOT NULL DEFAULT false,
  temperamento public.temperamento_pet,
  observacao text,
  foto_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pets TO authenticated;
GRANT ALL ON TABLE public.pets TO service_role;

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin gerencia pets" ON public.pets
  FOR ALL TO authenticated
  USING (public.eh_dono(empresa_id))
  WITH CHECK (public.eh_dono(empresa_id));

CREATE INDEX pets_cliente_idx ON public.pets (cliente_id);

-- Vínculo do atendimento (a visita) com o perfil do pet. Fica nulo pras
-- fichas que já existiam antes desta migração.
ALTER TABLE public.atendimentos
  ADD COLUMN pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL;

CREATE INDEX atendimentos_pet_idx ON public.atendimentos (pet_id);

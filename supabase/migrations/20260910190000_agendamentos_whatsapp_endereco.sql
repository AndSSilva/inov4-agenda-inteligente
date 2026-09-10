-- =========================================================================
-- Suporte à tela "Agendamentos" (fila de ação com WhatsApp) + endereço da
-- empresa nas Configurações.
-- =========================================================================

ALTER TABLE public.empresas
  ADD COLUMN endereco text NOT NULL DEFAULT '';

-- Novo status intermediário: pedido de confirmação já enviado ao cliente
-- (via WhatsApp, manualmente), aguardando ele responder. O admin confirma
-- manualmente na aba correspondente quando o cliente responder.
ALTER TYPE public.status_agendamento ADD VALUE IF NOT EXISTS 'aguardando_confirmacao';

ALTER TABLE public.agendamentos
  ADD COLUMN confirmacao_solicitada_em timestamptz,
  ADD COLUMN lembrete_enviado_em timestamptz;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS whatsapp_numero text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.empresas.whatsapp_numero IS
  'Número de WhatsApp do negócio, armazenado apenas com dígitos.';
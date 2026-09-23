ALTER FUNCTION public.registrar_preco_previsto() SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.registrar_preco_previsto() FROM PUBLIC, anon, authenticated;
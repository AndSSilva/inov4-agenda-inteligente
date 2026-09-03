REVOKE EXECUTE ON FUNCTION public.eh_dono(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eh_dono(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.horarios_ocupados(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.horarios_ocupados(uuid, date) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.criar_agendamento(text, uuid, timestamptz, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_agendamento(text, uuid, timestamptz, text, text, text, text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.provisionar_empresa() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provisionar_empresa() TO authenticated, service_role;
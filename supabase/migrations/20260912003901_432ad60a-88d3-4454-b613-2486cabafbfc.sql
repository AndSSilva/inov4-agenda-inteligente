REVOKE EXECUTE ON FUNCTION public.empresa_ativa(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protege_campos_master_empresa() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.eh_dono(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.empresa_do_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_master(uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.criar_agendamento(text, uuid, timestamptz, text, text, text, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_agendamento(text, uuid, timestamptz, text, text, text, text) TO anon, service_role;

REVOKE EXECUTE ON FUNCTION public.horarios_ocupados(uuid, date) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.horarios_ocupados(uuid, date) TO anon, service_role;
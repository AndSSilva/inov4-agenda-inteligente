GRANT SELECT ON TABLE public.empresas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.empresas TO authenticated;
GRANT ALL ON TABLE public.empresas TO service_role;

GRANT SELECT ON TABLE public.servicos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.servicos TO authenticated;
GRANT ALL ON TABLE public.servicos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clientes TO authenticated;
GRANT ALL ON TABLE public.clientes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agendamentos TO authenticated;
GRANT ALL ON TABLE public.agendamentos TO service_role;

GRANT SELECT ON TABLE public.empresa_admins TO authenticated;
GRANT ALL ON TABLE public.empresa_admins TO service_role;

GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
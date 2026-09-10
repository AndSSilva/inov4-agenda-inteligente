-- Execute manualmente (SQL editor do Supabase) DEPOIS de aplicar a migração
-- 20260908180000_admin_master_multiempresa.sql e depois que este e-mail já
-- tiver feito login pelo menos uma vez (precisa existir em auth.users).
--
-- Promove ands10.97@gmail.com a admin master da plataforma.
-- Não é uma migração (não roda em CI/deploy automático) porque depende de
-- dado específico do ambiente (o usuário já autenticado no Supabase Auth).

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'master'
FROM auth.users
WHERE email = 'ands10.97@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Conferir:
-- SELECT u.email, r.role FROM auth.users u
-- JOIN public.user_roles r ON r.user_id = u.id
-- WHERE u.email = 'ands10.97@gmail.com';

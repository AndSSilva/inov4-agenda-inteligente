DROP POLICY IF EXISTS "leitura empresas ativas ou proprias" ON public.empresas;

CREATE POLICY "visitantes leem empresas ativas"
ON public.empresas
FOR SELECT
TO anon
USING (ativa);

CREATE POLICY "administradores leem empresas permitidas"
ON public.empresas
FOR SELECT
TO authenticated
USING (ativa OR public.is_master(auth.uid()) OR id = public.empresa_do_admin(auth.uid()));
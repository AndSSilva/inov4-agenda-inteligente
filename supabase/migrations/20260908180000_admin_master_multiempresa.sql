-- =========================================================================
-- Admin master + multi-empresa (padrão validado no Inov4 Vitrine Digital)
-- + substituição de "controle de estoque" por "tipo_agenda"
-- =========================================================================

-- 1. Papéis (admin / master)
CREATE TYPE public.app_role AS ENUM ('admin', 'master');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'master');
$$;

-- Restringe quem pode executar (RPC pública só do necessário)
REVOKE EXECUTE ON FUNCTION public.is_master(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_master(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. Vínculo admin -> empresa (1 empresa por admin, igual ao Vitrine)
CREATE TABLE public.empresa_admins (
  user_id uuid PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.empresa_admins TO authenticated;
GRANT ALL ON public.empresa_admins TO service_role;
ALTER TABLE public.empresa_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin le proprio vinculo" ON public.empresa_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_master(auth.uid()));

CREATE OR REPLACE FUNCTION public.empresa_do_admin(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT empresa_id FROM public.empresa_admins WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.empresa_ativa(_empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.empresas WHERE id = _empresa_id AND ativa);
$$;

REVOKE EXECUTE ON FUNCTION public.empresa_do_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.empresa_do_admin(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.empresa_ativa(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.empresa_ativa(uuid) TO anon, authenticated, service_role;

-- 3. tipo_agenda (substitui o conceito de "controle de estoque" do Vitrine)
CREATE TYPE public.tipo_agenda AS ENUM (
  'saude_bem_estar',
  'beleza_estetica',
  'servicos_profissionais_consultoria',
  'educacao_treinamentos',
  'esporte_fitness_lazer',
  'automotivo_servicos_gerais',
  'eventos_gastronomia_entretenimento',
  'servicos_publicos_governamentais',
  'corporativo_rh',
  'pet_shop_veterinaria'
);

-- 4. Campos novos em empresas (branding + status + tipo_agenda)
ALTER TABLE public.empresas
  ADD COLUMN logo_url text,
  ADD COLUMN cor_primaria text NOT NULL DEFAULT '#b8451f',
  ADD COLUMN cor_secundaria text NOT NULL DEFAULT '#1f6f5c',
  ADD COLUMN cor_fundo text NOT NULL DEFAULT '',
  ADD COLUMN cor_texto text NOT NULL DEFAULT '',
  ADD COLUMN ativa boolean NOT NULL DEFAULT true,
  ADD COLUMN tipo_agenda public.tipo_agenda;

-- Dado de seed existente (Açaí Pet) precisa de um valor antes do NOT NULL
UPDATE public.empresas SET tipo_agenda = 'pet_shop_veterinaria' WHERE tipo_agenda IS NULL;
ALTER TABLE public.empresas ALTER COLUMN tipo_agenda SET NOT NULL;

-- 5. Migra admins existentes (owner_id) para o novo modelo antes de remover a coluna.
--    Quem já era dono de empresa vira também master da plataforma (bootstrap seguro,
--    evita perda de acesso; masters adicionais devem ser geridos manualmente depois).
INSERT INTO public.empresa_admins (user_id, empresa_id, full_name)
SELECT owner_id, id, '' FROM public.empresas WHERE owner_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT owner_id, 'admin' FROM public.empresas WHERE owner_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT owner_id, 'master' FROM public.empresas WHERE owner_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Fim do autocadastro de empresa/admin (era o bug documentado: "primeiro usuário vira admin")
DROP FUNCTION IF EXISTS public.provisionar_empresa();

-- 7. Remove owner_id e reescreve eh_dono / RLS de empresas
ALTER TABLE public.empresas DROP COLUMN owner_id;

DROP POLICY "empresas leitura publica" ON public.empresas;
DROP POLICY "dono insere empresa" ON public.empresas;
DROP POLICY "dono atualiza empresa" ON public.empresas;
DROP POLICY "dono remove empresa" ON public.empresas;

CREATE POLICY "leitura empresas ativas ou proprias" ON public.empresas FOR SELECT TO anon, authenticated
  USING (ativa OR public.is_master(auth.uid()) OR id = public.empresa_do_admin(auth.uid()));
CREATE POLICY "master insere empresa" ON public.empresas FOR INSERT TO authenticated
  WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "master atualiza empresa" ON public.empresas FOR UPDATE TO authenticated
  USING (public.is_master(auth.uid())) WITH CHECK (public.is_master(auth.uid()));
CREATE POLICY "admin atualiza dados operacionais" ON public.empresas FOR UPDATE TO authenticated
  USING (id = public.empresa_do_admin(auth.uid())) WITH CHECK (id = public.empresa_do_admin(auth.uid()));
CREATE POLICY "master remove empresa" ON public.empresas FOR DELETE TO authenticated
  USING (public.is_master(auth.uid()));

-- Guarda de coluna: admin de empresa (não-master) não pode alterar branding/tipo_agenda/
-- status/slug por essa via — só o master, através da tela dele. Necessário porque RLS
-- do Postgres não restringe colunas, só linhas; sem isso a policy operacional acima
-- deixaria qualquer admin mudar até o tipo_agenda, e você citou que regras futuras vão
-- depender desse campo.
CREATE OR REPLACE FUNCTION public.protege_campos_master_empresa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_master(auth.uid()) THEN
    NEW.slug := OLD.slug;
    NEW.logo_url := OLD.logo_url;
    NEW.cor_primaria := OLD.cor_primaria;
    NEW.cor_secundaria := OLD.cor_secundaria;
    NEW.cor_fundo := OLD.cor_fundo;
    NEW.cor_texto := OLD.cor_texto;
    NEW.ativa := OLD.ativa;
    NEW.tipo_agenda := OLD.tipo_agenda;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER empresas_protege_campos_master
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.protege_campos_master_empresa();

CREATE OR REPLACE FUNCTION public.eh_dono(_empresa uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _empresa = public.empresa_do_admin(auth.uid()) OR public.is_master(auth.uid());
$$;
-- eh_dono é mantida (agora cobrindo master também) para não quebrar as policies
-- de servicos/clientes/agendamentos, que já referenciam essa função.

-- 8. Isolamento de storage por empresa (logo), mesmo padrão do Vitrine
INSERT INTO storage.buckets (id, name, public)
VALUES ('empresa-logos', 'empresa-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "master gerencia logos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'empresa-logos' AND public.is_master(auth.uid()))
  WITH CHECK (bucket_id = 'empresa-logos' AND public.is_master(auth.uid()));
CREATE POLICY "leitura publica logos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'empresa-logos');

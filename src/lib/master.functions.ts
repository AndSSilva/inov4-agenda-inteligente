import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TIPO_AGENDA_VALUES } from "./empresas-utils";

const LOGO_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 anos

export type MasterEmpresa = {
  id: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
  corFundo: string;
  corTexto: string;
  tipoAgenda: string;
  ativa: boolean;
  createdAt: string;
  admins: { userId: string; fullName: string; email: string }[];
};

/** Toda ação do Admin Master exige o papel `master` verificado no banco. */
async function assertMaster(context: { supabase: unknown; userId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- contexto genérico do middleware de auth
  const { data, error } = await (context.supabase as any).rpc("is_master", {
    _user_id: context.userId,
  });
  if (error) throw new Error("Não foi possível validar a permissão.");
  if (!data) throw new Error("Acesso restrito.");
}

export const listEmpresasMaster = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MasterEmpresa[]> => {
    await assertMaster(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: empresas, error }, { data: membros }, { data: usersData }] = await Promise.all([
      supabaseAdmin
        .from("empresas")
        .select(
          "id, nome, slug, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto, tipo_agenda, ativa, created_at",
        )
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("empresa_admins").select("user_id, empresa_id, full_name"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    if (error) throw new Error("Não foi possível carregar as empresas.");

    const emails = new Map((usersData?.users ?? []).map((user) => [user.id, user.email ?? ""]));

    return (empresas ?? []).map((empresa) => ({
      id: empresa.id,
      nome: empresa.nome,
      slug: empresa.slug,
      logoUrl: empresa.logo_url,
      corPrimaria: empresa.cor_primaria,
      corSecundaria: empresa.cor_secundaria,
      corFundo: empresa.cor_fundo,
      corTexto: empresa.cor_texto,
      tipoAgenda: empresa.tipo_agenda,
      ativa: empresa.ativa,
      createdAt: empresa.created_at,
      admins: (membros ?? [])
        .filter((membro) => membro.empresa_id === empresa.id)
        .map((membro) => ({
          userId: membro.user_id,
          fullName: membro.full_name,
          email: emails.get(membro.user_id) ?? "",
        })),
    }));
  });

const hex = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inválida");
const hexOrEmpty = z
  .string()
  .refine((v) => v === "" || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v), "Cor inválida");

const empresaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Endereço inválido")
    .min(2)
    .max(60),
  corPrimaria: hex,
  corSecundaria: hex,
  corFundo: hexOrEmpty.optional().default(""),
  corTexto: hexOrEmpty.optional().default(""),
  tipoAgenda: z.enum(TIPO_AGENDA_VALUES),
  ativa: z.boolean(),
  logo: z
    .object({
      base64: z.string().min(10).max(4_000_000),
      contentType: z.string().min(3).max(80),
      extension: z.string().min(2).max(6),
    })
    .nullable()
    .optional(),
});

const SLUGS_RESERVADOS = new Set(["admin", "master", "api", "agendar", "_authenticated", "auth"]);

export const salvarEmpresaMaster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => empresaSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertMaster(context);
    if (SLUGS_RESERVADOS.has(data.slug)) throw new Error("Este endereço é reservado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let logoUrl: string | null = null;
    if (data.logo) {
      const bytes = Uint8Array.from(atob(data.logo.base64), (char) => char.charCodeAt(0));
      const path = `logos/${crypto.randomUUID()}.${data.logo.extension}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("empresa-logos")
        .upload(path, bytes, { contentType: data.logo.contentType, cacheControl: "31536000" });
      if (uploadError) throw new Error("Falha ao enviar a logo.");
      const { data: signed } = await supabaseAdmin.storage
        .from("empresa-logos")
        .createSignedUrl(path, LOGO_URL_TTL);
      logoUrl = signed?.signedUrl ?? null;
    }

    const payload = {
      nome: data.nome,
      slug: data.slug,
      cor_primaria: data.corPrimaria,
      cor_secundaria: data.corSecundaria,
      cor_fundo: data.corFundo,
      cor_texto: data.corTexto,
      tipo_agenda: data.tipoAgenda,
      ativa: data.ativa,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("empresas").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: criada, error } = await supabaseAdmin
      .from("empresas")
      .insert(payload)
      .select("id")
      .single();
    if (error || !criada) throw new Error(error?.message ?? "Falha ao criar a empresa.");

    return { id: criada.id };
  });

export const definirEmpresaAtiva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), ativa: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertMaster(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("empresas")
      .update({ ativa: data.ativa })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Exclusão definitiva: apaga serviços, clientes, agendamentos e contas de admin da empresa. */
export const excluirEmpresaMaster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), confirmSlug: z.string().trim().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMaster(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: empresa, error: loadError } = await supabaseAdmin
      .from("empresas")
      .select("id, slug")
      .eq("id", data.id)
      .single();
    if (loadError || !empresa) throw new Error("Empresa não encontrada.");
    if (empresa.slug !== data.confirmSlug)
      throw new Error("Confirmação não corresponde ao endereço da empresa.");

    await supabaseAdmin.from("agendamentos").delete().eq("empresa_id", empresa.id);
    await supabaseAdmin.from("clientes").delete().eq("empresa_id", empresa.id);
    await supabaseAdmin.from("servicos").delete().eq("empresa_id", empresa.id);

    const { data: membros } = await supabaseAdmin
      .from("empresa_admins")
      .select("user_id")
      .eq("empresa_id", empresa.id);
    await supabaseAdmin.from("empresa_admins").delete().eq("empresa_id", empresa.id);

    for (const membro of membros ?? []) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", membro.user_id);
      await supabaseAdmin.auth.admin.deleteUser(membro.user_id);
    }

    const { error } = await supabaseAdmin.from("empresas").delete().eq("id", empresa.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const criarAdminEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        empresaId: z.string().uuid(),
        fullName: z.string().trim().min(2).max(120),
        email: z.string().trim().email(),
        password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMaster(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !criado.user) throw new Error(error?.message ?? "Falha ao criar o usuário.");

    const userId = criado.user.id;

    const { error: vinculoError } = await supabaseAdmin
      .from("empresa_admins")
      .insert({ user_id: userId, empresa_id: data.empresaId, full_name: data.fullName });
    if (vinculoError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Falha ao vincular o administrador à empresa.");
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleError) throw new Error("Falha ao conceder o acesso de administrador.");

    return { ok: true as const };
  });

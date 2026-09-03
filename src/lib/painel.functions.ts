import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dataLocal, isoLocal } from "./tempo";

export type Empresa = {
  id: string;
  nome: string;
  slug: string;
  hora_inicio: string;
  hora_fim: string;
  dias_semana: number[];
};

export type Servico = {
  id: string;
  nome: string;
  duracao_min: number;
  preco: number;
  intervalo_min: number;
  ativo: boolean;
};

export type AgendamentoItem = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_filiacao: string | null;
  servico_nome: string;
  servico_preco: number;
};

export type ClienteItem = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  filiacao: string | null;
  total_agendamentos: number;
  ultimo_status: string | null;
  ultimo_em: string | null;
};

type Ctx = { supabase: any; userId: string };

async function empresaDoUsuario(context: Ctx): Promise<Empresa> {
  const { data: existente } = await context.supabase
    .from("empresas")
    .select("id, nome, slug, hora_inicio, hora_fim, dias_semana")
    .eq("owner_id", context.userId)
    .maybeSingle();
  if (existente) return existente as Empresa;

  const { error } = await context.supabase.rpc("provisionar_empresa");
  if (error) throw new Error(error.message);

  const { data: criada, error: erroBusca } = await context.supabase
    .from("empresas")
    .select("id, nome, slug, hora_inicio, hora_fim, dias_semana")
    .eq("owner_id", context.userId)
    .single();
  if (erroBusca) throw new Error(erroBusca.message);
  return criada as Empresa;
}

const SELECT_AGENDAMENTO =
  "id, inicio, fim, status, clientes(nome, telefone, filiacao), servicos(nome, preco)";

function mapAgendamento(row: any): AgendamentoItem {
  return {
    id: row.id,
    inicio: row.inicio,
    fim: row.fim,
    status: row.status,
    cliente_nome: row.clientes?.nome ?? "—",
    cliente_telefone: row.clientes?.telefone ?? "",
    cliente_filiacao: row.clientes?.filiacao ?? null,
    servico_nome: row.servicos?.nome ?? "—",
    servico_preco: Number(row.servicos?.preco ?? 0),
  };
}

export const getEmpresa = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => empresaDoUsuario(context as unknown as Ctx));

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const empresa = await empresaDoUsuario(ctx);
    const hoje = dataLocal(new Date());
    const inicioDia = new Date(isoLocal(hoje, "00:00")).toISOString();
    const fimDia = new Date(new Date(inicioDia).getTime() + 86_400_000).toISOString();

    const { data: doDia } = await ctx.supabase
      .from("agendamentos")
      .select(SELECT_AGENDAMENTO)
      .eq("empresa_id", empresa.id)
      .gte("inicio", inicioDia)
      .lt("inicio", fimDia)
      .order("inicio", { ascending: true });

    const { data: proximos } = await ctx.supabase
      .from("agendamentos")
      .select(SELECT_AGENDAMENTO)
      .eq("empresa_id", empresa.id)
      .gte("inicio", new Date().toISOString())
      .neq("status", "cancelado")
      .order("inicio", { ascending: true })
      .limit(6);

    const { count: totalClientes } = await ctx.supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresa.id);

    const lista = (doDia ?? []).map(mapAgendamento);
    const validos = lista.filter((a) => a.status !== "cancelado");
    const confirmados = lista.filter(
      (a) => a.status === "confirmado" || a.status === "concluido",
    ).length;
    const receita = validos.reduce((s, a) => s + a.servico_preco, 0);
    const minutosOcupados = validos.reduce(
      (s, a) => s + (new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 60_000,
      0,
    );
    const [hi, mi] = empresa.hora_inicio.split(":").map(Number);
    const [hf, mf] = empresa.hora_fim.split(":").map(Number);
    const capacidade = Math.max(1, (hf ?? 18) * 60 + (mf ?? 0) - ((hi ?? 9) * 60 + (mi ?? 0)));

    return {
      empresa,
      metricas: {
        agendados: validos.length,
        confirmados,
        receita,
        ocupacao: Math.min(100, Math.round((minutosOcupados / capacidade) * 100)),
        totalClientes: totalClientes ?? 0,
      },
      proximos: (proximos ?? []).map(mapAgendamento),
    };
  });

export const listServicos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const empresa = await empresaDoUsuario(ctx);
    const { data } = await ctx.supabase
      .from("servicos")
      .select("id, nome, duracao_min, preco, intervalo_min, ativo")
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: true });
    return {
      empresa,
      servicos: ((data ?? []) as any[]).map((s) => ({ ...s, preco: Number(s.preco) })) as Servico[],
    };
  });

const servicoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2).max(80),
  duracao_min: z.number().int().min(5).max(600),
  preco: z.number().min(0).max(100000),
  intervalo_min: z.number().int().min(0).max(240),
  ativo: z.boolean(),
});

export const salvarServico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => servicoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const empresa = await empresaDoUsuario(ctx);
    const payload = {
      nome: data.nome,
      duracao_min: data.duracao_min,
      preco: data.preco,
      intervalo_min: data.intervalo_min,
      ativo: data.ativo,
      empresa_id: empresa.id,
    };
    const query = data.id
      ? ctx.supabase.from("servicos").update(payload).eq("id", data.id)
      : ctx.supabase.from("servicos").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirServico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { error } = await ctx.supabase.from("servicos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAgenda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const empresa = await empresaDoUsuario(ctx);
    const inicio = new Date(isoLocal(data.de, "00:00")).toISOString();
    const fim = new Date(new Date(isoLocal(data.ate, "00:00")).getTime() + 86_400_000).toISOString();
    const { data: rows } = await ctx.supabase
      .from("agendamentos")
      .select(SELECT_AGENDAMENTO)
      .eq("empresa_id", empresa.id)
      .gte("inicio", inicio)
      .lt("inicio", fim)
      .order("inicio", { ascending: true });
    return { empresa, agendamentos: (rows ?? []).map(mapAgendamento) };
  });

export const atualizarStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pendente", "confirmado", "cancelado", "concluido"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { error } = await ctx.supabase
      .from("agendamentos")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listClientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const empresa = await empresaDoUsuario(ctx);
    const { data: clientes } = await ctx.supabase
      .from("clientes")
      .select("id, nome, telefone, email, filiacao")
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: false });

    const { data: ags } = await ctx.supabase
      .from("agendamentos")
      .select("cliente_id, status, inicio")
      .eq("empresa_id", empresa.id)
      .order("inicio", { ascending: false });

    const porCliente = new Map<string, { total: number; status: string; em: string }>();
    for (const a of (ags ?? []) as any[]) {
      const atual = porCliente.get(a.cliente_id);
      if (atual) atual.total += 1;
      else porCliente.set(a.cliente_id, { total: 1, status: a.status, em: a.inicio });
    }

    const lista: ClienteItem[] = ((clientes ?? []) as any[]).map((c) => {
      const info = porCliente.get(c.id);
      return {
        ...c,
        total_agendamentos: info?.total ?? 0,
        ultimo_status: info?.status ?? null,
        ultimo_em: info?.em ?? null,
      };
    });
    return { empresa, clientes: lista };
  });

export const salvarEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        nome: z.string().trim().min(2).max(80),
        slug: z
          .string()
          .trim()
          .min(3)
          .max(60)
          .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
        hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
        hora_fim: z.string().regex(/^\d{2}:\d{2}$/),
        dias_semana: z.array(z.number().int().min(0).max(6)).min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const empresa = await empresaDoUsuario(ctx);
    const { error } = await ctx.supabase.from("empresas").update(data).eq("id", empresa.id);
    if (error) return { ok: false as const, erro: error.message };
    return { ok: true as const };
  });

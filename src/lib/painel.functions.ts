import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dataLocal, isoLocal } from "./tempo";

export type Empresa = {
  id: string;
  nome: string;
  slug: string;
  endereco: string;
  hora_inicio: string;
  hora_fim: string;
  dias_semana: number[];
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  cor_fundo: string;
  cor_texto: string;
  tipo_agenda: string;
  ativa: boolean;
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
  servico_duracao_min: number;
  confirmacao_solicitada_em: string | null;
  lembrete_enviado_em: string | null;
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

/**
 * Empresa do administrador logado. O vínculo é definido pelo Admin Master
 * (tabela empresa_admins) — não existe mais autocadastro no primeiro login.
 */
async function empresaDoUsuario(context: Ctx): Promise<Empresa> {
  const { data: vinculo, error: erroVinculo } = await context.supabase
    .from("empresa_admins")
    .select("empresa_id")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (erroVinculo) throw new Error(erroVinculo.message);
  if (!vinculo) throw new Error("Sua conta não está vinculada a nenhuma empresa.");

  const { data: empresa, error } = await context.supabase
    .from("empresas")
    .select(
      "id, nome, slug, endereco, hora_inicio, hora_fim, dias_semana, logo_url, cor_primaria, cor_secundaria, cor_fundo, cor_texto, tipo_agenda, ativa",
    )
    .eq("id", vinculo.empresa_id)
    .single();
  if (error) throw new Error(error.message);
  return empresa as Empresa;
}

const SELECT_AGENDAMENTO =
  "id, inicio, fim, status, confirmacao_solicitada_em, lembrete_enviado_em, clientes(nome, telefone, filiacao), servicos(nome, preco, duracao_min)";

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
    servico_duracao_min: Number(row.servicos?.duracao_min ?? 30),
    confirmacao_solicitada_em: row.confirmacao_solicitada_em ?? null,
    lembrete_enviado_em: row.lembrete_enviado_em ?? null,
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

    const lista: AgendamentoItem[] = (doDia ?? []).map(mapAgendamento);
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
      proximos: (proximos ?? []).map(mapAgendamento) as AgendamentoItem[],
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
    const fim = new Date(
      new Date(isoLocal(data.ate, "00:00")).getTime() + 86_400_000,
    ).toISOString();
    const { data: rows } = await ctx.supabase
      .from("agendamentos")
      .select(SELECT_AGENDAMENTO)
      .eq("empresa_id", empresa.id)
      .gte("inicio", inicio)
      .lt("inicio", fim)
      .order("inicio", { ascending: true });
    return { empresa, agendamentos: (rows ?? []).map(mapAgendamento) as AgendamentoItem[] };
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

/**
 * Fila de gestão da tela "Agendamentos": separada em duas listas —
 * pendentes de ação do admin, e aguardando o cliente confirmar (depois que
 * o admin já mandou o pedido de confirmação pelo WhatsApp).
 */
export const listAgendamentosGestao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const empresa = await empresaDoUsuario(ctx);
    const { data: rows } = await ctx.supabase
      .from("agendamentos")
      .select(SELECT_AGENDAMENTO)
      .eq("empresa_id", empresa.id)
      .in("status", ["pendente", "aguardando_confirmacao"])
      .order("inicio", { ascending: true });

    const todas = (rows ?? []).map(mapAgendamento) as AgendamentoItem[];
    return {
      empresa,
      pendentes: todas.filter((a) => a.status === "pendente"),
      aguardandoConfirmacao: todas.filter((a) => a.status === "aguardando_confirmacao"),
    };
  });

/**
 * Ações manuais da fila. Cada uma só atualiza o registro — o envio da
 * mensagem pelo WhatsApp acontece no cliente (abre wa.me numa aba nova),
 * porque não há integração automática com o WhatsApp.
 */
export const agirAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        acao: z.enum(["confirmar", "lembrete", "cancelar", "cliente_confirmou"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const agora = new Date().toISOString();
    const payload: Record<string, unknown> =
      data.acao === "confirmar"
        ? { status: "aguardando_confirmacao", confirmacao_solicitada_em: agora }
        : data.acao === "lembrete"
          ? { lembrete_enviado_em: agora }
          : data.acao === "cancelar"
            ? { status: "cancelado" }
            : { status: "confirmado" };

    const { error } = await ctx.supabase.from("agendamentos").update(payload).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Remarca pra um novo horário e recalcula o fim a partir da duração do serviço. */
export const remarcarAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), novoInicio: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: atual, error: erroBusca } = await ctx.supabase
      .from("agendamentos")
      .select("servico_id, servicos(duracao_min)")
      .eq("id", data.id)
      .single();
    if (erroBusca || !atual) throw new Error("Agendamento não encontrado.");

    const duracaoMin = Number(
      (atual as { servicos?: { duracao_min?: number } }).servicos?.duracao_min ?? 30,
    );
    const novoInicio = new Date(data.novoInicio);
    if (Number.isNaN(novoInicio.getTime())) throw new Error("Data/hora inválida.");
    const novoFim = new Date(novoInicio.getTime() + duracaoMin * 60_000);

    const { error } = await ctx.supabase
      .from("agendamentos")
      .update({
        inicio: novoInicio.toISOString(),
        fim: novoFim.toISOString(),
        status: "pendente",
        confirmacao_solicitada_em: null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, novoInicio: novoInicio.toISOString() };
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

// O slug NÃO é editável por aqui: é a rota pública (/$slug) e fica sob
// controle exclusivo do Admin Master (evita a empresa quebrar o próprio link
// publicado ou colidir com outra). Ver src/lib/master.functions.ts.
export const salvarEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        nome: z.string().trim().min(2).max(80),
        endereco: z.string().trim().max(200).optional().default(""),
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

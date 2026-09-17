/* eslint-disable @typescript-eslint/no-explicit-any -- mesmo padrão de painel.functions.ts:
   os retornos de join do supabase-js não têm tipos gerados úteis aqui. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FOTO_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 anos

type Ctx = { supabase: any; userId: string };

async function empresaIdDoUsuario(ctx: Ctx): Promise<string> {
  const { data: vinculo, error } = await ctx.supabase
    .from("empresa_admins")
    .select("empresa_id")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!vinculo) throw new Error("Sua conta não está vinculada a nenhuma empresa.");
  return vinculo.empresa_id as string;
}

const SELECT_AGENDAMENTO_TRIAGEM =
  "id, inicio, fim, status, clientes(nome, telefone, filiacao), servicos(nome, preco, duracao_min)";

export type ItemTriagem = {
  agendamentoId: string;
  inicio: string;
  status: string;
  clienteNome: string;
  clienteTelefone: string;
  petNome: string | null;
  servicoNome: string;
};

function mapTriagem(row: any): ItemTriagem {
  return {
    agendamentoId: row.id,
    inicio: row.inicio,
    status: row.status,
    clienteNome: row.clientes?.nome ?? "—",
    clienteTelefone: row.clientes?.telefone ?? "",
    petNome: row.clientes?.filiacao ?? null,
    servicoNome: row.servicos?.nome ?? "—",
  };
}

/** Agendamentos que ainda não têm atendimento iniciado. */
export const listTriagem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ItemTriagem[]> => {
    const ctx = context as unknown as Ctx;
    const empresaId = await empresaIdDoUsuario(ctx);

    const { data: iniciados } = await ctx.supabase
      .from("atendimentos")
      .select("agendamento_id")
      .eq("empresa_id", empresaId);
    const idsIniciados = new Set((iniciados ?? []).map((a: any) => a.agendamento_id));

    const { data: rows, error } = await ctx.supabase
      .from("agendamentos")
      .select(SELECT_AGENDAMENTO_TRIAGEM)
      .eq("empresa_id", empresaId)
      .order("inicio", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);

    return (rows ?? []).filter((row: any) => !idsIniciados.has(row.id)).map(mapTriagem);
  });

export const iniciarAtendimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ agendamentoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const empresaId = await empresaIdDoUsuario(ctx);

    const { data: agendamento, error: erroAgendamento } = await ctx.supabase
      .from("agendamentos")
      .select("id, clientes(filiacao)")
      .eq("id", data.agendamentoId)
      .eq("empresa_id", empresaId)
      .single();
    if (erroAgendamento || !agendamento) throw new Error("Agendamento não encontrado.");

    const { error } = await ctx.supabase.from("atendimentos").insert({
      agendamento_id: data.agendamentoId,
      empresa_id: empresaId,
      pet_nome: (agendamento as any).clientes?.filiacao ?? "",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type ItemFicha = {
  id: string;
  agendamentoId: string;
  inicio: string;
  clienteNome: string;
  servicoNome: string;
  petNome: string;
};

const SELECT_FICHA_LISTA =
  "id, pet_nome, agendamentos(id, inicio, clientes(nome, filiacao), servicos(nome))";

export const listFichaAtendimento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ItemFicha[]> => {
    const ctx = context as unknown as Ctx;
    const empresaId = await empresaIdDoUsuario(ctx);
    const { data: rows, error } = await ctx.supabase
      .from("atendimentos")
      .select(SELECT_FICHA_LISTA)
      .eq("empresa_id", empresaId)
      .eq("etapa", "em_atendimento")
      .order("iniciado_em", { ascending: true });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row: any) => ({
      id: row.id,
      agendamentoId: row.agendamentos?.id ?? "",
      inicio: row.agendamentos?.inicio ?? "",
      clienteNome: row.agendamentos?.clientes?.nome ?? "—",
      servicoNome: row.agendamentos?.servicos?.nome ?? "—",
      petNome: row.pet_nome || row.agendamentos?.clientes?.filiacao || "Pet sem nome",
    }));
  });

export type Ficha = {
  id: string;
  fotoUrl: string | null;
  petNome: string;
  petTipo: string | null;
  sexo: string | null;
  nascimento: string | null;
  peso: number | null;
  cadastrado: boolean;
  temperamento: string | null;
  observacao: string | null;
  clienteNome: string;
  servicoNome: string;
  inicio: string;
};

export const getFicha = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<Ficha> => {
    const ctx = context as unknown as Ctx;
    const empresaId = await empresaIdDoUsuario(ctx);
    const { data: row, error } = await ctx.supabase
      .from("atendimentos")
      .select(
        "id, foto_url, pet_nome, pet_tipo, sexo, nascimento, peso, cadastrado, temperamento, observacao, agendamentos(inicio, clientes(nome), servicos(nome))",
      )
      .eq("id", data.id)
      .eq("empresa_id", empresaId)
      .single();
    if (error || !row) throw new Error("Ficha não encontrada.");

    return {
      id: row.id,
      fotoUrl: row.foto_url,
      petNome: row.pet_nome ?? "",
      petTipo: row.pet_tipo,
      sexo: row.sexo,
      nascimento: row.nascimento,
      peso: row.peso === null ? null : Number(row.peso),
      cadastrado: row.cadastrado,
      temperamento: row.temperamento,
      observacao: row.observacao,
      clienteNome: (row as any).agendamentos?.clientes?.nome ?? "—",
      servicoNome: (row as any).agendamentos?.servicos?.nome ?? "—",
      inicio: (row as any).agendamentos?.inicio ?? "",
    };
  });

const TIPOS_PET = ["cachorro", "gato", "ave", "roedor", "reptil", "outro"] as const;

export const salvarFicha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        petNome: z.string().trim().min(1).max(80),
        petTipo: z.enum(TIPOS_PET).nullable(),
        sexo: z.enum(["macho", "femea"]).nullable(),
        nascimento: z.string().nullable(),
        peso: z.number().positive().max(999).nullable(),
        cadastrado: z.boolean(),
        temperamento: z.enum(["manso", "bravo"]).nullable(),
        observacao: z.string().trim().max(2000).optional().default(""),
        foto: z
          .object({
            base64: z.string().min(10).max(6_000_000),
            contentType: z.string(),
            extension: z.string(),
          })
          .nullable()
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const empresaId = await empresaIdDoUsuario(ctx);

    let fotoUrl: string | null = null;
    if (data.foto) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const bytes = Uint8Array.from(atob(data.foto.base64), (char) => char.charCodeAt(0));
      const path = `${empresaId}/${data.id}-${Date.now()}.${data.foto.extension}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("atendimento-fotos")
        .upload(path, bytes, { contentType: data.foto.contentType, cacheControl: "31536000" });
      if (uploadError) throw new Error("Falha ao enviar a foto.");
      const { data: signed } = await supabaseAdmin.storage
        .from("atendimento-fotos")
        .createSignedUrl(path, FOTO_URL_TTL);
      fotoUrl = signed?.signedUrl ?? null;
    }

    const { error } = await ctx.supabase
      .from("atendimentos")
      .update({
        pet_nome: data.petNome,
        pet_tipo: data.petTipo,
        sexo: data.sexo,
        nascimento: data.nascimento || null,
        peso: data.peso,
        cadastrado: data.cadastrado,
        temperamento: data.temperamento,
        observacao: data.observacao || null,
        etapa: "finalizado",
        finalizado_em: new Date().toISOString(),
        ...(fotoUrl ? { foto_url: fotoUrl } : {}),
      })
      .eq("id", data.id)
      .eq("empresa_id", empresaId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type ItemSala = {
  id: string;
  petNome: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string;
  servicoPreco: number;
  finalizadoEm: string | null;
  pagamentoConfirmado: boolean;
  entregaConfirmada: boolean;
};

export const listSala = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ItemSala[]> => {
    const ctx = context as unknown as Ctx;
    const empresaId = await empresaIdDoUsuario(ctx);
    const { data: rows, error } = await ctx.supabase
      .from("atendimentos")
      .select(
        "id, pet_nome, finalizado_em, pagamento_confirmado, entrega_confirmada, agendamentos(clientes(nome, telefone), servicos(nome, preco))",
      )
      .eq("empresa_id", empresaId)
      .eq("etapa", "finalizado")
      .eq("entrega_confirmada", false)
      .order("finalizado_em", { ascending: true });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row: any) => ({
      id: row.id,
      petNome: row.pet_nome || "Pet sem nome",
      clienteNome: row.agendamentos?.clientes?.nome ?? "—",
      clienteTelefone: row.agendamentos?.clientes?.telefone ?? "",
      servicoNome: row.agendamentos?.servicos?.nome ?? "—",
      servicoPreco: Number(row.agendamentos?.servicos?.preco ?? 0),
      finalizadoEm: row.finalizado_em,
      pagamentoConfirmado: row.pagamento_confirmado,
      entregaConfirmada: row.entrega_confirmada,
    }));
  });

export const confirmarPagamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { error } = await ctx.supabase
      .from("atendimentos")
      .update({ pagamento_confirmado: true, pagamento_confirmado_em: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const confirmarEntrega = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: atual, error: erroBusca } = await ctx.supabase
      .from("atendimentos")
      .select("pagamento_confirmado")
      .eq("id", data.id)
      .single();
    if (erroBusca || !atual) throw new Error("Atendimento não encontrado.");
    if (!atual.pagamento_confirmado) {
      throw new Error("Confirme o pagamento antes de liberar a entrega.");
    }

    const { error } = await ctx.supabase
      .from("atendimentos")
      .update({ entrega_confirmada: true, entrega_confirmada_em: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

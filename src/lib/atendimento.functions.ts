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
  atendimentoId: string | null;
  etapaAtendimento: string | null;
};

function mapTriagem(row: any, atendimento: { id: string; etapa: string } | undefined): ItemTriagem {
  return {
    agendamentoId: row.id,
    inicio: row.inicio,
    status: row.status,
    clienteNome: row.clientes?.nome ?? "—",
    clienteTelefone: row.clientes?.telefone ?? "",
    petNome: row.clientes?.filiacao ?? null,
    servicoNome: row.servicos?.nome ?? "—",
    atendimentoId: atendimento?.id ?? null,
    etapaAtendimento: atendimento?.etapa ?? null,
  };
}

/**
 * Traz todos os agendamentos recentes — inclusive os que já têm atendimento
 * iniciado, marcados como tal, pra dar pra filtrar e reabrir se precisar.
 */
export const listTriagem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ItemTriagem[]> => {
    const ctx = context as unknown as Ctx;
    const empresaId = await empresaIdDoUsuario(ctx);

    const { data: iniciados } = await ctx.supabase
      .from("atendimentos")
      .select("id, agendamento_id, etapa")
      .eq("empresa_id", empresaId);
    const porAgendamento = new Map<string, { id: string; etapa: string }>(
      (iniciados ?? []).map((a: any) => [a.agendamento_id, { id: a.id, etapa: a.etapa }]),
    );

    const { data: rows, error } = await ctx.supabase
      .from("agendamentos")
      .select(SELECT_AGENDAMENTO_TRIAGEM)
      .eq("empresa_id", empresaId)
      .order("inicio", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row: any) => mapTriagem(row, porAgendamento.get(row.id)));
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

    const { data: criado, error } = await ctx.supabase
      .from("atendimentos")
      .insert({
        agendamento_id: data.agendamentoId,
        empresa_id: empresaId,
        pet_nome: (agendamento as any).clientes?.filiacao ?? "",
      })
      .select("id")
      .single();
    if (error || !criado) throw new Error(error?.message ?? "Falha ao iniciar o atendimento.");
    return { ok: true as const, atendimentoId: criado.id as string };
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
  petId: string | null;
  clienteId: string;
  precoPrevisto: number;
  valorReal: number | null;
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
        "id, pet_id, foto_url, pet_nome, pet_tipo, sexo, nascimento, peso, cadastrado, temperamento, observacao, valor_real, agendamentos(inicio, cliente_id, preco_previsto, clientes(nome), servicos(nome))",
      )
      .eq("id", data.id)
      .eq("empresa_id", empresaId)
      .single();
    if (error || !row) throw new Error("Ficha não encontrada.");

    return {
      id: row.id,
      petId: row.pet_id,
      clienteId: (row as any).agendamentos?.cliente_id ?? "",
      precoPrevisto: Number((row as any).agendamentos?.preco_previsto ?? 0),
      valorReal: row.valor_real === null ? null : Number(row.valor_real),
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

export type PetResumo = {
  id: string;
  nome: string;
  tipo: string | null;
  sexo: string | null;
  nascimento: string | null;
  peso: number | null;
  cadastrado: boolean;
  temperamento: string | null;
  observacao: string | null;
  fotoUrl: string | null;
};

/** Pets já cadastrados pra esse cliente (mesmo telefone) — pra decidir se é o mesmo animal ou outro. */
export const listPetsDoCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ clienteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<PetResumo[]> => {
    const ctx = context as unknown as Ctx;
    const empresaId = await empresaIdDoUsuario(ctx);
    const { data: rows, error } = await ctx.supabase
      .from("pets")
      .select(
        "id, nome, tipo, sexo, nascimento, peso, cadastrado, temperamento, observacao, foto_url",
      )
      .eq("cliente_id", data.clienteId)
      .eq("empresa_id", empresaId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((p: any) => ({
      id: p.id,
      nome: p.nome,
      tipo: p.tipo,
      sexo: p.sexo,
      nascimento: p.nascimento,
      peso: p.peso === null ? null : Number(p.peso),
      cadastrado: p.cadastrado,
      temperamento: p.temperamento,
      observacao: p.observacao,
      fotoUrl: p.foto_url,
    }));
  });

const TIPOS_PET = ["cachorro", "gato", "ave", "roedor", "reptil", "outro"] as const;

export const salvarFicha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        petId: z.string().uuid().nullable(),
        petNome: z.string().trim().min(1).max(80),
        petTipo: z.enum(TIPOS_PET).nullable(),
        sexo: z.enum(["macho", "femea"]).nullable(),
        nascimento: z.string().nullable(),
        peso: z.number().positive().max(999).nullable(),
        valorReal: z.number().finite().min(0).max(100000).refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 0.000001, "Informe no máximo duas casas decimais"),
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

    const { data: atendimentoAtual, error: erroAtual } = await ctx.supabase
      .from("atendimentos")
      .select("pagamento_confirmado, agendamentos(cliente_id)")
      .eq("id", data.id)
      .eq("empresa_id", empresaId)
      .single();
    if (erroAtual || !atendimentoAtual) throw new Error("Atendimento não encontrado.");
    if (atendimentoAtual.pagamento_confirmado) throw new Error("Não é possível alterar uma ficha com pagamento confirmado.");
    const clienteId = (atendimentoAtual as any).agendamentos?.cliente_id as string;

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

    const dadosPet = {
      empresa_id: empresaId,
      cliente_id: clienteId,
      nome: data.petNome,
      tipo: data.petTipo,
      sexo: data.sexo,
      nascimento: data.nascimento || null,
      peso: data.peso,
      cadastrado: data.cadastrado,
      temperamento: data.temperamento,
      observacao: data.observacao || null,
      updated_at: new Date().toISOString(),
      ...(fotoUrl ? { foto_url: fotoUrl } : {}),
    };

    // Atualiza o perfil canônico do pet (o mesmo animal escolhido, ou um
    // novo perfil se for a primeira visita dele / outro animal).
    let petId = data.petId;
    if (petId) {
      const { error: erroPet } = await ctx.supabase.from("pets").update(dadosPet).eq("id", petId);
      if (erroPet) throw new Error(erroPet.message);
    } else {
      const { data: criado, error: erroPet } = await ctx.supabase
        .from("pets")
        .insert(dadosPet)
        .select("id")
        .single();
      if (erroPet || !criado)
        throw new Error(erroPet?.message ?? "Falha ao criar o perfil do pet.");
      petId = criado.id;
    }

    const { error } = await ctx.supabase
      .from("atendimentos")
      .update({
        pet_id: petId,
        pet_nome: data.petNome,
        pet_tipo: data.petTipo,
        sexo: data.sexo,
        nascimento: data.nascimento || null,
        peso: data.peso,
        valor_real: data.valorReal,
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

export type ItemHistorico = {
  id: string;
  petId: string | null;
  petNome: string;
  clienteNome: string;
  servicoNome: string;
  finalizadoEm: string | null;
  entregaConfirmada: boolean;
};

/** Todas as fichas já finalizadas (independente de já terem saído da Sala ou não). */
export const listHistorico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ItemHistorico[]> => {
    const ctx = context as unknown as Ctx;
    const empresaId = await empresaIdDoUsuario(ctx);
    const { data: rows, error } = await ctx.supabase
      .from("atendimentos")
      .select(
        "id, pet_id, pet_nome, entrega_confirmada, finalizado_em, agendamentos(clientes(nome), servicos(nome))",
      )
      .eq("empresa_id", empresaId)
      .eq("etapa", "finalizado")
      .order("finalizado_em", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row: any) => ({
      id: row.id,
      petId: row.pet_id,
      petNome: row.pet_nome || "Pet sem nome",
      clienteNome: row.agendamentos?.clientes?.nome ?? "—",
      servicoNome: row.agendamentos?.servicos?.nome ?? "—",
      finalizadoEm: row.finalizado_em,
      entregaConfirmada: row.entrega_confirmada,
    }));
  });

export type VisitaPet = {
  atendimentoId: string;
  inicio: string;
  finalizadoEm: string | null;
  valorReal: number | null;
  pagamentoConfirmado: boolean;
  servicoNome: string;
  clienteNome: string;
  fotoUrl: string | null;
  petTipo: string | null;
  sexo: string | null;
  nascimento: string | null;
  peso: number | null;
  cadastrado: boolean;
  temperamento: string | null;
  observacao: string | null;
};

export type HistoricoPet = {
  pet: PetResumo;
  visitas: VisitaPet[];
};

export type PetComHistorico = {
  petId: string;
  nome: string;
  tipo: string | null;
  fotoUrl: string | null;
  totalVisitas: number;
  ultimaVisitaEm: string | null;
};

/** Histórico agrupado por pet — cada linha é um animal, não uma ficha avulsa. */
export const listPetsComHistorico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PetComHistorico[]> => {
    const ctx = context as unknown as Ctx;
    const empresaId = await empresaIdDoUsuario(ctx);

    const { data: visitas, error } = await ctx.supabase
      .from("atendimentos")
      .select("pet_id, finalizado_em")
      .eq("empresa_id", empresaId)
      .eq("etapa", "finalizado")
      .not("pet_id", "is", null);
    if (error) throw new Error(error.message);

    const porPet = new Map<string, { total: number; ultima: string | null }>();
    for (const v of visitas ?? []) {
      const atual = porPet.get(v.pet_id) ?? { total: 0, ultima: null };
      atual.total += 1;
      if (!atual.ultima || (v.finalizado_em && v.finalizado_em > atual.ultima)) {
        atual.ultima = v.finalizado_em;
      }
      porPet.set(v.pet_id, atual);
    }
    if (porPet.size === 0) return [];

    const { data: pets, error: erroPets } = await ctx.supabase
      .from("pets")
      .select("id, nome, tipo, foto_url")
      .in("id", Array.from(porPet.keys()));
    if (erroPets) throw new Error(erroPets.message);

    return (pets ?? [])
      .map((p: any) => {
        const resumo = porPet.get(p.id)!;
        return {
          petId: p.id,
          nome: p.nome || "Pet sem nome",
          tipo: p.tipo,
          fotoUrl: p.foto_url,
          totalVisitas: resumo.total,
          ultimaVisitaEm: resumo.ultima,
        };
      })
      .sort((a: PetComHistorico, b: PetComHistorico) =>
        (b.ultimaVisitaEm ?? "").localeCompare(a.ultimaVisitaEm ?? ""),
      );
  });

/** Cadastro atual do pet + todas as visitas (fichas) já vinculadas a ele, mais recente primeiro. */
export const listHistoricoPet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ petId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<HistoricoPet> => {
    const ctx = context as unknown as Ctx;
    const empresaId = await empresaIdDoUsuario(ctx);

    const { data: pet, error: erroPet } = await ctx.supabase
      .from("pets")
      .select(
        "id, nome, tipo, sexo, nascimento, peso, cadastrado, temperamento, observacao, foto_url",
      )
      .eq("id", data.petId)
      .eq("empresa_id", empresaId)
      .single();
    if (erroPet || !pet) throw new Error("Pet não encontrado.");

    const { data: visitas, error: erroVisitas } = await ctx.supabase
      .from("atendimentos")
      .select(
        "id, foto_url, pet_tipo, sexo, nascimento, peso, cadastrado, temperamento, observacao, valor_real, pagamento_confirmado, finalizado_em, agendamentos(inicio, clientes(nome), servicos(nome))",
      )
      .eq("pet_id", data.petId)
      .eq("empresa_id", empresaId)
      .order("finalizado_em", { ascending: false });
    if (erroVisitas) throw new Error(erroVisitas.message);

    return {
      pet: {
        id: pet.id,
        nome: pet.nome,
        tipo: pet.tipo,
        sexo: pet.sexo,
        nascimento: pet.nascimento,
        peso: pet.peso === null ? null : Number(pet.peso),
        cadastrado: pet.cadastrado,
        temperamento: pet.temperamento,
        observacao: pet.observacao,
        fotoUrl: pet.foto_url,
      },
      visitas: (visitas ?? []).map((v: any) => ({
        atendimentoId: v.id,
        inicio: v.agendamentos?.inicio ?? "",
        finalizadoEm: v.finalizado_em,
        valorReal: v.valor_real === null ? null : Number(v.valor_real),
        pagamentoConfirmado: v.pagamento_confirmado,
        servicoNome: v.agendamentos?.servicos?.nome ?? "—",
        clienteNome: v.agendamentos?.clientes?.nome ?? "—",
        fotoUrl: v.foto_url,
        petTipo: v.pet_tipo,
        sexo: v.sexo,
        nascimento: v.nascimento,
        peso: v.peso === null ? null : Number(v.peso),
        cadastrado: v.cadastrado,
        temperamento: v.temperamento,
        observacao: v.observacao,
      })),
    };
  });

export type ItemSala = {
  id: string;
  petId: string | null;
  petNome: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string;
  servicoPreco: number;
  valorReal: number | null;
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
        "id, pet_id, pet_nome, finalizado_em, valor_real, pagamento_confirmado, entrega_confirmada, agendamentos(preco_previsto, clientes(nome, telefone), servicos(nome))",
      )
      .eq("empresa_id", empresaId)
      .eq("etapa", "finalizado")
      .eq("entrega_confirmada", false)
      .order("finalizado_em", { ascending: true });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row: any) => ({
      id: row.id,
      petId: row.pet_id,
      petNome: row.pet_nome || "Pet sem nome",
      clienteNome: row.agendamentos?.clientes?.nome ?? "—",
      clienteTelefone: row.agendamentos?.clientes?.telefone ?? "",
      servicoNome: row.agendamentos?.servicos?.nome ?? "—",
      servicoPreco: Number(row.agendamentos?.preco_previsto ?? 0),
      valorReal: row.valor_real === null ? null : Number(row.valor_real),
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
    const empresaId = await empresaIdDoUsuario(ctx);
    const { data: confirmado, error } = await ctx.supabase
      .from("atendimentos")
      .update({ pagamento_confirmado: true, pagamento_confirmado_em: new Date().toISOString() })
      .eq("id", data.id)
      .eq("empresa_id", empresaId)
      .eq("pagamento_confirmado", false)
      .not("valor_real", "is", null)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!confirmado) throw new Error("Informe o valor real na ficha antes de confirmar o pagamento.");
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

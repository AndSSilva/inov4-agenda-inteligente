import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { criarClientePublico } from "./supabase-publico";
import { diaSemanaLocal, isoLocal } from "./tempo";

export type ServicoPublico = {
  id: string;
  nome: string;
  duracao_min: number;
  preco: number;
  intervalo_min: number;
};

export type EmpresaPublica = {
  id: string;
  nome: string;
  slug: string;
  hora_inicio: string;
  hora_fim: string;
  dias_semana: number[];
  servicos: ServicoPublico[];
};

export const getEmpresaPublica = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data }): Promise<EmpresaPublica | null> => {
    const supabase = criarClientePublico();
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id, nome, slug, hora_inicio, hora_fim, dias_semana")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!empresa) return null;

    const { data: servicos } = await supabase
      .from("servicos")
      .select("id, nome, duracao_min, preco, intervalo_min")
      .eq("empresa_id", empresa.id)
      .eq("ativo", true)
      .order("created_at", { ascending: true });

    return {
      ...empresa,
      dias_semana: (empresa.dias_semana ?? []) as number[],
      servicos: (servicos ?? []).map((s) => ({ ...s, preco: Number(s.preco) })),
    };
  });

function minutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function hhmm(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const getHorariosDisponiveis = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1).max(80),
        servicoId: z.string().uuid(),
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<string[]> => {
    const supabase = criarClientePublico();
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id, hora_inicio, hora_fim, dias_semana")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!empresa) return [];

    const dias = (empresa.dias_semana ?? []) as number[];
    if (!dias.includes(diaSemanaLocal(data.data))) return [];

    const { data: servico } = await supabase
      .from("servicos")
      .select("duracao_min, intervalo_min")
      .eq("id", data.servicoId)
      .eq("empresa_id", empresa.id)
      .eq("ativo", true)
      .maybeSingle();
    if (!servico) return [];

    const { data: ocupados } = await supabase.rpc("horarios_ocupados", {
      p_empresa: empresa.id,
      p_data: data.data,
    });

    const intervalos = (ocupados ?? []).map((o) => ({
      inicio: new Date(o.inicio).getTime(),
      fim: new Date(o.fim).getTime(),
    }));

    const passo = Math.max(5, servico.duracao_min + servico.intervalo_min);
    const abre = minutos(empresa.hora_inicio);
    const fecha = minutos(empresa.hora_fim);
    const agora = Date.now();

    const livres: string[] = [];
    for (let t = abre; t + servico.duracao_min <= fecha; t += passo) {
      const hora = hhmm(t);
      const inicio = new Date(isoLocal(data.data, hora)).getTime();
      const fim = inicio + servico.duracao_min * 60_000;
      if (inicio <= agora) continue;
      const conflito = intervalos.some((o) => inicio < o.fim && fim > o.inicio);
      if (!conflito) livres.push(hora);
    }
    return livres;
  });

export const criarReservaPublica = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1).max(80),
        servicoId: z.string().uuid(),
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        hora: z.string().regex(/^\d{2}:\d{2}$/),
        nome: z.string().trim().min(2).max(100),
        telefone: z.string().trim().min(10).max(25),
        email: z.string().trim().email().max(255).optional().or(z.literal("")),
        filiacao: z.string().trim().max(120).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; id: string } | { ok: false; erro: string }> => {
    const supabase = criarClientePublico();
    const { data: id, error } = await supabase.rpc("criar_agendamento", {
      p_slug: data.slug,
      p_servico: data.servicoId,
      p_inicio: new Date(isoLocal(data.data, data.hora)).toISOString(),
      p_nome: data.nome,
      p_telefone: data.telefone,
      ...(data.email ? { p_email: data.email } : {}),
      ...(data.filiacao ? { p_filiacao: data.filiacao } : {}),
    });
    if (error) return { ok: false, erro: error.message };
    return { ok: true, id: id as string };
  });

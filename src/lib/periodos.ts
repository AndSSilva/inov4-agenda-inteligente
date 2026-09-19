import { dataLocal, diaSemanaLocal, somaDias } from "./tempo";

/** inicio/fim no formato YYYY-MM-DD, ambos inclusivos. */
export type Periodo = { inicio: string; fim: string };

export type PeriodoPreset =
  | "hoje"
  | "ontem"
  | "esta_semana"
  | "este_mes"
  | "mes_passado"
  | "proximos_7"
  | "proximos_30"
  | "personalizado";

export const ROTULO_PERIODO: Record<PeriodoPreset, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  esta_semana: "Esta semana",
  este_mes: "Este mês",
  mes_passado: "Mês passado",
  proximos_7: "Próximos 7 dias",
  proximos_30: "Próximos 30 dias",
  personalizado: "Personalizado",
};

function inicioMes(data: string): string {
  const [y, m] = data.split("-");
  return `${y}-${m}-01`;
}

function fimMes(data: string): string {
  const [y, m] = data.split("-").map(Number);
  const proximoMes =
    m === 12 ? `${(y ?? 0) + 1}-01-01` : `${y}-${String((m ?? 1) + 1).padStart(2, "0")}-01`;
  return somaDias(proximoMes, -1);
}

/** Calcula o intervalo de um preset. Ignorado (retorna o próprio período atual) quando "personalizado". */
export function calcularPeriodo(
  preset: PeriodoPreset,
  atual: Periodo,
  hojeIso = dataLocal(new Date()),
): Periodo {
  switch (preset) {
    case "hoje":
      return { inicio: hojeIso, fim: hojeIso };
    case "ontem": {
      const ontem = somaDias(hojeIso, -1);
      return { inicio: ontem, fim: ontem };
    }
    case "esta_semana": {
      const dow = diaSemanaLocal(hojeIso); // 0 = domingo
      const offsetSegunda = dow === 0 ? -6 : 1 - dow;
      const inicio = somaDias(hojeIso, offsetSegunda);
      return { inicio, fim: somaDias(inicio, 6) };
    }
    case "este_mes":
      return { inicio: inicioMes(hojeIso), fim: fimMes(hojeIso) };
    case "mes_passado": {
      const fimAnterior = somaDias(inicioMes(hojeIso), -1);
      return { inicio: inicioMes(fimAnterior), fim: fimAnterior };
    }
    case "proximos_7":
      return { inicio: hojeIso, fim: somaDias(hojeIso, 6) };
    case "proximos_30":
      return { inicio: hojeIso, fim: somaDias(hojeIso, 29) };
    case "personalizado":
      return atual;
  }
}

export function formatarPeriodo({ inicio, fim }: Periodo): string {
  const f = (d: string) => d.split("-").reverse().join("/");
  return inicio === fim ? f(inicio) : `${f(inicio)} – ${f(fim)}`;
}

// Utilidades de data/hora no fuso de São Paulo (UTC-3, sem horário de verão).
export const FUSO_OFFSET = "-03:00";

export function isoLocal(data: string, hora: string): string {
  return `${data}T${hora.length === 5 ? hora : hora.slice(0, 5)}:00${FUSO_OFFSET}`;
}

export function dataLocal(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function horaLocal(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function dataExtenso(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function dataCurta(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

export function diaSemanaLocal(data: string): number {
  const [y, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

export function somaDias(data: string, dias: number): string {
  const [y, m, d] = data.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

export function moeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export const NOMES_DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const ROTULO_STATUS: Record<string, string> = {
  pendente: "Pendente",
  aguardando_confirmacao: "Aguardando cliente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  concluido: "Concluído",
};

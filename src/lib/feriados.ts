/** Domingo de Páscoa do ano, pelo algoritmo de Meeus/Jones/Butcher. */
function pascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function somaDiasUtc(data: Date, dias: number): Date {
  const copia = new Date(data);
  copia.setUTCDate(copia.getUTCDate() + dias);
  return copia;
}

function paraIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

const cache = new Map<number, Set<string>>();

/** Feriados nacionais fixos + móveis (Carnaval, Sexta Santa, Corpus Christi). */
export function feriadosNacionais(ano: number): Set<string> {
  const existente = cache.get(ano);
  if (existente) return existente;

  const p = pascoa(ano);
  const fixos = [
    `${ano}-01-01`, // Confraternização Universal
    `${ano}-04-21`, // Tiradentes
    `${ano}-05-01`, // Dia do Trabalho
    `${ano}-09-07`, // Independência
    `${ano}-10-12`, // Nossa Senhora Aparecida
    `${ano}-11-02`, // Finados
    `${ano}-11-15`, // Proclamação da República
    `${ano}-11-20`, // Dia Nacional de Zumbi e da Consciência Negra
    `${ano}-12-25`, // Natal
  ];
  const moveis = [
    paraIso(somaDiasUtc(p, -47)), // Carnaval (terça-feira)
    paraIso(somaDiasUtc(p, -2)), // Sexta-feira Santa
    paraIso(somaDiasUtc(p, 60)), // Corpus Christi
  ];

  const conjunto = new Set([...fixos, ...moveis]);
  cache.set(ano, conjunto);
  return conjunto;
}

/** `dataIso` no formato YYYY-MM-DD. */
export function isFeriadoNacional(dataIso: string): boolean {
  const ano = Number(dataIso.slice(0, 4));
  if (!Number.isFinite(ano)) return false;
  return feriadosNacionais(ano).has(dataIso);
}

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** DDD (2) + 8 dígitos (fixo) ou 9 dígitos (celular) = 10 ou 11 dígitos. */
export function telefoneValido(valor: string): boolean {
  const digitos = apenasDigitos(valor);
  return digitos.length === 10 || digitos.length === 11;
}

/** Aplica a máscara (DD) NNNNN-NNNN / (DD) NNNN-NNNN enquanto a pessoa digita. */
export function formatarTelefone(valor: string): string {
  const digitos = apenasDigitos(valor).slice(0, 11);
  if (digitos.length === 0) return "";

  const ddd = digitos.slice(0, 2);
  if (digitos.length <= 2) return `(${ddd}`;

  const resto = digitos.slice(2);
  const celular = resto.length > 8; // celular tem 9 dígitos após o DDD
  const parte1 = celular ? resto.slice(0, 5) : resto.slice(0, 4);
  const parte2 = celular ? resto.slice(5, 9) : resto.slice(4, 8);

  return parte2 ? `(${ddd}) ${parte1}-${parte2}` : `(${ddd}) ${parte1}`;
}

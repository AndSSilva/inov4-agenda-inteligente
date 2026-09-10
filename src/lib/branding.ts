export type EmpresaBranding = {
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_fundo?: string | null;
  cor_texto?: string | null;
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string | null | undefined): value is string {
  return !!value && HEX.test(value.trim());
}

function expand(hex: string) {
  const clean = hex.trim().replace("#", "");
  return clean.length === 3
    ? clean
        .split("")
        .map((char) => char + char)
        .join("")
    : clean;
}

/** Luminância relativa para escolher texto claro ou escuro sobre a cor. */
function luminance(hex: string) {
  const value = expand(hex);
  const channels = [0, 2, 4].map((offset) => {
    const part = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function contrastForeground(hex: string) {
  return luminance(hex) > 0.5 ? "#1a1614" : "#ffffff";
}

/**
 * Variáveis do design system sobrescritas com a paleta da empresa (definida
 * pelo Admin Master no cadastro). Aplicada só no cabeçalho/realce do painel
 * do admin — `includeSurface` liga o fundo/texto customizados, pensados
 * para a agenda pública, não para a área administrativa.
 */
export function brandingStyle(
  branding: EmpresaBranding,
  options: { includeSurface?: boolean } = {},
): React.CSSProperties {
  const includeSurface = options.includeSurface ?? false;
  const primary = isHexColor(branding.cor_primaria) ? branding.cor_primaria : null;
  const secondary = isHexColor(branding.cor_secundaria) ? branding.cor_secundaria : null;
  const background = includeSurface && isHexColor(branding.cor_fundo) ? branding.cor_fundo : null;
  const text = includeSurface && isHexColor(branding.cor_texto) ? branding.cor_texto : null;

  return {
    ...(primary
      ? {
          ["--brand" as string]: primary,
          ["--primary" as string]: primary,
          ["--primary-foreground" as string]: contrastForeground(primary),
          ["--ring" as string]: primary,
        }
      : {}),
    ...(secondary
      ? {
          ["--secondary" as string]: secondary,
          ["--secondary-foreground" as string]: contrastForeground(secondary),
        }
      : {}),
    ...(background ? { ["--background" as string]: background } : {}),
    ...(text ? { ["--foreground" as string]: text } : {}),
  } as React.CSSProperties;
}

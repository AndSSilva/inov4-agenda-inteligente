export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export const TIPO_AGENDA_VALUES = [
  "saude_bem_estar",
  "beleza_estetica",
  "servicos_profissionais_consultoria",
  "educacao_treinamentos",
  "esporte_fitness_lazer",
  "automotivo_servicos_gerais",
  "eventos_gastronomia_entretenimento",
  "servicos_publicos_governamentais",
  "corporativo_rh",
  "pet_shop_veterinaria",
] as const;

export type TipoAgenda = (typeof TIPO_AGENDA_VALUES)[number];

export const TIPO_AGENDA_LABELS: Record<TipoAgenda, string> = {
  saude_bem_estar: "Saúde e Bem-estar",
  beleza_estetica: "Beleza e Estética",
  servicos_profissionais_consultoria: "Serviços Profissionais e Consultoria",
  educacao_treinamentos: "Educação e Treinamentos",
  esporte_fitness_lazer: "Esporte, Fitness e Lazer",
  automotivo_servicos_gerais: "Automotivo e Serviços Gerais",
  eventos_gastronomia_entretenimento: "Eventos, Gastronomia e Entretenimento",
  servicos_publicos_governamentais: "Serviços Públicos e Governamentais",
  corporativo_rh: "Corporativo e Recursos Humanos",
  pet_shop_veterinaria: "Pet Shop e Veterinária",
};

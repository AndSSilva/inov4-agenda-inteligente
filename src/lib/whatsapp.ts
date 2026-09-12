/** Normaliza um telefone brasileiro (com ou sem DDI/máscara) pro formato wa.me. */
export function telefoneParaWhatsApp(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos;
  return `55${digitos}`;
}

export function linkWhatsApp(telefone: string, mensagem: string): string {
  const numero = telefoneParaWhatsApp(telefone);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function abrirWhatsApp(telefone: string, mensagem: string) {
  window.open(linkWhatsApp(telefone, mensagem), "_blank", "noopener,noreferrer");
}

function dataHoraFormatada(iso: string): { data: string; hora: string } {
  const d = new Date(iso);
  return {
    data: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
    }).format(d),
    hora: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d),
  };
}

type DadosMensagem = {
  clienteNome: string;
  servicoNome: string;
  empresaNome: string;
  inicioIso: string;
};

export function mensagemConfirmacao({
  clienteNome,
  servicoNome,
  empresaNome,
  inicioIso,
}: DadosMensagem) {
  const { data, hora } = dataHoraFormatada(inicioIso);
  return `Olá, ${clienteNome}! Aqui é da ${empresaNome}. Confirmando seu agendamento de *${servicoNome}* no dia ${data} às ${hora}. Você confirma? 🙂`;
}

export function mensagemLembrete({
  clienteNome,
  servicoNome,
  empresaNome,
  inicioIso,
}: DadosMensagem) {
  const { data, hora } = dataHoraFormatada(inicioIso);
  return `Olá, ${clienteNome}! Passando para lembrar do seu agendamento de *${servicoNome}* no dia ${data} às ${hora}, na ${empresaNome}. Te esperamos!`;
}

export function mensagemCancelamento({
  clienteNome,
  servicoNome,
  empresaNome,
  inicioIso,
}: DadosMensagem) {
  const { data, hora } = dataHoraFormatada(inicioIso);
  return `Olá, ${clienteNome}. Infelizmente precisamos cancelar seu agendamento de *${servicoNome}* do dia ${data} às ${hora} na ${empresaNome}. Entre em contato pra gente remarcar. Desculpe o transtorno!`;
}

export function mensagemRemarcacao(dados: DadosMensagem & { novoInicioIso: string }) {
  const nova = dataHoraFormatada(dados.novoInicioIso);
  return `Olá, ${dados.clienteNome}! Seu agendamento de *${dados.servicoNome}* na ${dados.empresaNome} foi remarcado para ${nova.data} às ${nova.hora}. Qualquer coisa é só chamar por aqui.`;
}

/** Mensagem que o CLIENTE manda pro WhatsApp da empresa ao concluir a reserva pública. */
export function mensagemNovaReservaCliente(
  dados: DadosMensagem & { clienteTelefone: string; filiacao?: string | undefined },
) {
  const { data, hora } = dataHoraFormatada(dados.inicioIso);
  const linhaObs = dados.filiacao ? `\nObs: ${dados.filiacao}` : "";
  return `Olá! Acabei de agendar pela agenda online da ${dados.empresaNome}.\n\nServiço: ${dados.servicoNome}\nDia: ${data} às ${hora}\nNome: ${dados.clienteNome}\nTelefone: ${dados.clienteTelefone}${linhaObs}\n\nAguardo a confirmação, obrigado(a)!`;
}

# MVP — SaaS de Agendamento Inteligente com CRM

Direção visual escolhida: **Golden Board** (creme, laranja terroso, títulos serifados Fraunces + Space Grotesk).

## O que será construído

### Backend (Lovable Cloud)
Ativação do backend com banco de dados e login por email/senha. Tabelas:

- **empresas** — nome, slug público, dono. Criada automaticamente no primeiro acesso.
- **serviços (tipos de agenda)** — nome, duração em minutos, preço, intervalo entre horários, ativo.
- **clientes (CRM)** — nome, telefone/WhatsApp, email, filiação (pet/dependente/observação).
- **agendamentos** — data/hora, status (Pendente, Confirmado, Cancelado, Concluído), cliente, serviço.

Cada empresa só enxerga os próprios dados. A página pública de reserva lê apenas serviços ativos e horários ocupados da empresa do link, sem expor dados de clientes.

### Área administrativa (após login)
- **Dashboard** — saudação, cartões de métricas (agendados, confirmados, receita do dia, ocupação), lista dos próximos agendamentos com tags de status e resumo do CRM.
- **Tipos de Agenda** — CRUD de serviços com duração, preço e intervalo.
- **Minha Agenda** — visão de dia e semana com grade de horários e lista; mudança de status direto no item (confirmar, concluir, cancelar).
- **CRM / Clientes** — tabela com busca por nome, telefone ou filiação, tags de status e histórico de agendamentos do contato.
- **Configurações do link público** — nome da empresa, slug e horário de funcionamento (início, fim, dias da semana).

### Página pública de reserva (`/agendar/<slug>`)
Mobile-first, cartão único com stepper de 4 etapas:
1. Escolha do serviço (nome, duração, preço).
2. Escolha da data e do horário — slots gerados pela duração + intervalo do serviço dentro do horário de funcionamento, com slots já ocupados desabilitados.
3. Pré-cadastro: Nome, Telefone (WhatsApp), Filiação/Dependente (opcional), email opcional.
4. Confirmação com resumo e status "Pendente".

A reserva cria/atualiza o contato no CRM e o agendamento da empresa.

## Detalhes técnicos
- Rotas TanStack: `/` (landing + entrada), `/auth`, `/_authenticated/dashboard`, `/_authenticated/servicos`, `/_authenticated/agenda`, `/_authenticated/crm`, `/_authenticated/configuracoes`, `/agendar/$slug`.
- Tokens do Golden Board em `src/styles.css` (@theme); fontes carregadas por `<link>` no root.
- Leitura pública e criação da reserva via server functions sem exigir login; escritas do painel escopadas ao usuário autenticado.
- Cálculo de slots no servidor, verificando conflitos com agendamentos existentes.
- Dados de exemplo (uma empresa demo com serviços, clientes e agendamentos) para o painel já nascer preenchido.
- Metadados de SEO próprios por rota, em português.

## Fora do escopo deste MVP
Pagamentos, envio real de WhatsApp/email, múltiplos profissionais por serviço e app nativo.

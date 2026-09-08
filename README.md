# Smart Bookings Pro

Crie um MVP de um SaaS de Agendamento Inteligente com CRM Integrado. O sistema deve permitir multi-inquilinos (multi-tenant/empresas), diferentes tipos de serviços/agendamentos, fluxo público de pré-cadastro/reserva e um painel de gestão de contatos (CRM).

1. Arquitetura e Tipos de Dados

Organização / SaaS: Cada conta representa um negócio (ex: PetShop, Clínica, Salão).

Tipos de Agenda / Serviços: Nome do serviço, Duração (minutos), Preço, Intervalo entre horários.

Agendamentos: Data/Hora, Status (Pendente, Confirmado, Cancelado, Concluído), Vínculo com o Cliente e com o Serviço.

Clientes / CRM: Nome, Telefone/WhatsApp, Email, Filiação/Vínculo (Campo flexível para nome do pet, nome do dependente ou observação de quem está sendo atendido).

2. Estrutura do Layout e Navegação

Área Administrativa (Painel do Cliente SaaS):

Dashboard: Resumo do dia, próximos agendamentos e métricas rápidas.

Tipos de Agenda: CRUD de serviços com configurações de tempo e valor.

Minha Agenda: Visualização em calendário (dia/semana) e lista de horários.

CRM / Clientes: Lista de contatos capturados no pré-cadastro com histórico de agendamentos e filtro de busca por nome, telefone ou filiação.

Página Pública de Agendamento (Visão do Cliente final):

Etapa 1: Seleção do Tipo de Agenda / Serviço.

Etapa 2: Escolha de Data e Horário disponível.

Etapa 3 (Pré-cadastro/Confirmação): Formulário para coletar Nome, Telefone (WhatsApp) e Filiação/Dependente (ex: "Nome do Pet ou Dependente (opcional)").

Etapa 4: Tela de confirmação do agendamento com resumo e status.

3. UX/UI e Recursos

Interface moderna, limpa e responsiva (mobile-first para a página pública).

Componentes visuais claros para seleção de datas e slots de horários disponíveis.

Tabela de CRM com campo de busca rápido e tags de status para os clientes.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://inov4-agenda-inteligente.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/84e1e0db-46f0-4e1e-b619-908e0c54fcfb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

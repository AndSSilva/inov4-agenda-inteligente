import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cronica · Agendamento inteligente com CRM integrado" },
      {
        name: "description",
        content:
          "Receba reservas por um link público, organize sua agenda e acompanhe seus clientes em um CRM simples. Feito para pet shops, clínicas e salões.",
      },
      { property: "og:title", content: "Cronica · Agendamento inteligente com CRM" },
      {
        property: "og:description",
        content: "Link público de reservas, agenda organizada e CRM em um só lugar.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="board-bg min-h-screen bg-cream text-ink">
      <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-brand font-display text-sm font-semibold text-cream">
              C
            </span>
            <span className="text-sm font-semibold tracking-tight">Cronica</span>
          </div>
          <Link to="/admin/login" className="text-sm font-medium text-branddeep">
            Entrar
          </Link>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section>
            <p className="text-xs font-medium tracking-[0.14em] text-branddeep uppercase">
              Agendamento + CRM
            </p>
            <h1 className="mt-2 max-w-[20ch] text-4xl text-balance sm:text-5xl font-display">
              Encaixe cada cliente no horário certo do seu quadro.
            </h1>
            <p className="mt-4 max-w-[52ch] text-sm text-inksoft">
              Um link público para o cliente reservar em quatro passos, uma agenda que se organiza
              sozinha e um CRM que guarda telefone, WhatsApp e o nome do pet ou dependente.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/admin/login"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream shadow-board ring-1 ring-brand"
              >
                Acessar o painel
              </Link>
              <Link
                to="/agendar/$slug"
                params={{ slug: "acai-pet" }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-inksoft ring-1 ring-border"
              >
                Ver página de reserva
              </Link>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl bg-paper shadow-board ring-1 ring-border">
            <div className="border-b border-border bg-gradient-to-b from-gold/25 to-transparent p-5">
              <p className="text-xs font-medium tracking-[0.14em] text-branddeep uppercase">
                Do jeito que funciona
              </p>
              <h2 className="mt-1 text-2xl text-balance font-display">
                Quatro etapas, sem atrito.
              </h2>
            </div>
            <div className="grid gap-2 p-5">
              {[
                ["1", "Serviço", "Duração, preço e intervalo definidos por você."],
                ["2", "Horário", "Slots livres calculados na hora, sem conflito."],
                ["3", "Pré-cadastro", "Nome, WhatsApp e filiação do pet ou dependente."],
                ["4", "Confirmação", "Resumo da reserva e status para acompanhar."],
              ].map(([n, titulo, texto]) => (
                <div
                  key={n}
                  className="flex items-start gap-3 rounded-lg bg-cream/50 p-3 ring-1 ring-border"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-xs text-cream">
                    {n}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{titulo}</p>
                    <p className="text-xs text-inksoft">{texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

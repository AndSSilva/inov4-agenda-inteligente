import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AdminShell } from "@/components/admin/AdminShell";
import { StatusDot, StatusTag } from "@/components/StatusTag";
import { getDashboard, listClientes } from "@/lib/painel.functions";
import { horaLocal, moeda } from "@/lib/tempo";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Cronica" },
      { name: "description", content: "Resumo do dia, próximos agendamentos e métricas rápidas." },
      { property: "og:title", content: "Dashboard · Cronica" },
      { property: "og:description", content: "Resumo do dia e próximos agendamentos." },
    ],
  }),
  component: DashboardPage,
});

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={`mt-1 line-clamp-2 text-xl font-extrabold break-words sm:text-2xl ${
          highlight ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DashboardPage() {
  const carregar = useServerFn(getDashboard);
  const carregarClientes = useServerFn(listClientes);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => carregar(),
  });
  const { data: crm } = useQuery({ queryKey: ["clientes"], queryFn: () => carregarClientes() });

  return (
    <AdminShell title="Dashboard">
      {isLoading && <p className="text-sm text-muted-foreground">Carregando dados...</p>}
      {isError && (
        <p className="text-sm text-destructive">Não foi possível carregar os indicadores.</p>
      )}

      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Agendados hoje" value={String(data.metricas.agendados)} />
            <Stat label="Confirmados hoje" value={String(data.metricas.confirmados)} highlight />
            <Stat label="Receita hoje" value={moeda(data.metricas.receita)} />
            <Stat label="Ocupação hoje" value={`${data.metricas.ocupacao}%`} />
          </div>

          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Próximos agendamentos</h2>
              <span className="text-xs text-muted-foreground">{data.proximos.length} na fila</span>
            </div>
            {data.proximos.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum agendamento futuro. Compartilhe seu link público para receber reservas.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {data.proximos.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3 text-sm">
                    <span className="w-12 shrink-0 font-semibold">{horaLocal(a.inicio)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {a.servico_nome}
                      {a.cliente_filiacao ? ` · ${a.cliente_filiacao}` : ` · ${a.cliente_nome}`}
                    </span>
                    <StatusTag status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Clientes</h2>
              <span className="text-xs text-muted-foreground">
                {data.metricas.totalClientes} contatos
              </span>
            </div>
            {(crm?.clientes ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum contato ainda.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {(crm?.clientes ?? []).slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center gap-2 py-2.5 text-sm">
                    <StatusDot status={c.ultimo_status} />
                    <span className="min-w-0 flex-1 truncate">
                      {c.nome} · {c.telefone}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c.filiacao ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}

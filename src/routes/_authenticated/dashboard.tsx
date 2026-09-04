import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PainelShell } from "@/components/PainelShell";
import { StatusDot, StatusTag } from "@/components/StatusTag";
import { getDashboard, listClientes } from "@/lib/painel.functions";
import { horaLocal, moeda } from "@/lib/tempo";

export const Route = createFileRoute("/_authenticated/dashboard")({
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

function DashboardPage() {
  const carregar = useServerFn(getDashboard);
  const carregarClientes = useServerFn(listClientes);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => carregar() });
  const { data: crm } = useQuery({ queryKey: ["clientes"], queryFn: () => carregarClientes() });

  if (isLoading || !data) {
    return (
      <PainelShell empresaNome="…">
        <p className="text-sm text-inksoft">Carregando seu quadro…</p>
      </PainelShell>
    );
  }

  const m = data.metricas;

  return (
    <PainelShell empresaNome={data.empresa.nome}>
      <p className="text-xs font-medium tracking-[0.14em] text-inksoft uppercase">Resumo do dia</p>
      <h1 className="mt-1 max-w-[34ch] text-2xl text-balance font-display">
        Bom dia. {m.agendados > 0 ? "O quadro tem movimento hoje." : "O quadro está livre hoje."}
      </h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica titulo="Agendados" valor={String(m.agendados)} />
        <Metrica titulo="Confirmados" valor={String(m.confirmados)} cor="text-conf" />
        <Metrica titulo="Renda hoje" valor={moeda(m.receita)} />
        <Metrica titulo="Ocupação" valor={`${m.ocupacao}%`} cor="text-branddeep" />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Próximos agendamentos</p>
          <span className="text-xs text-inksoft">{data.proximos.length} na fila</span>
        </div>
        <div className="grid gap-2">
          {data.proximos.length === 0 && (
            <p className="rounded-lg bg-cream/50 p-3 text-sm text-inksoft ring-1 ring-border">
              Nenhum agendamento futuro. Compartilhe seu link público para receber reservas.
            </p>
          )}
          {data.proximos.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-lg bg-cream/50 p-3 ring-1 ring-border"
            >
              <span className="w-12 shrink-0 text-sm font-semibold font-display">
                {horaLocal(a.inicio)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {a.servico_nome}
                {a.cliente_filiacao ? ` · ${a.cliente_filiacao}` : ` · ${a.cliente_nome}`}
              </span>
              <StatusTag status={a.status} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-cream/50 p-3 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">CRM · Clientes</p>
          <span className="text-xs text-inksoft">{m.totalClientes} contatos</span>
        </div>
        <div className="mt-3 grid gap-1.5">
          {(crm?.clientes ?? []).slice(0, 4).map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm">
              <StatusDot status={c.ultimo_status} />
              <span className="min-w-0 flex-1 truncate">
                {c.nome} · {c.telefone}
              </span>
              <span className="shrink-0 text-xs text-inksoft">{c.filiacao ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </PainelShell>
  );
}

function Metrica({ titulo, valor, cor }: { titulo: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-lg bg-cream/70 p-3 ring-1 ring-border">
      <p className="text-xs text-inksoft">{titulo}</p>
      <p className={`mt-1 text-2xl font-display ${cor ?? ""}`}>{valor}</p>
    </div>
  );
}

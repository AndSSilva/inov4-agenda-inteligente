import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { StatusDot, StatusTag } from "@/components/StatusTag";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDashboard, listClientes } from "@/lib/painel.functions";
import {
  calcularPeriodo,
  formatarPeriodo,
  ROTULO_PERIODO,
  type Periodo,
  type PeriodoPreset,
} from "@/lib/periodos";
import { dataCurta, dataLocal, horaLocal, moeda } from "@/lib/tempo";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Cronica" },
      { name: "description", content: "Métricas, agenda e histórico por período." },
      { property: "og:title", content: "Dashboard · Cronica" },
      { property: "og:description", content: "Métricas e agendamentos por período." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

const PRESETS: PeriodoPreset[] = [
  "hoje",
  "ontem",
  "esta_semana",
  "este_mes",
  "mes_passado",
  "proximos_7",
  "proximos_30",
  "personalizado",
];

function DashboardPage() {
  const carregar = useServerFn(getDashboard);
  const carregarClientes = useServerFn(listClientes);

  const [preset, setPreset] = useState<PeriodoPreset>("hoje");
  const hojeIso = dataLocal(new Date());
  const [periodo, setPeriodo] = useState<Periodo>({ inicio: hojeIso, fim: hojeIso });

  function escolherPreset(novo: PeriodoPreset) {
    setPreset(novo);
    if (novo !== "personalizado") setPeriodo(calcularPeriodo(novo, periodo, hojeIso));
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", periodo.inicio, periodo.fim],
    queryFn: () => carregar({ data: periodo }),
  });
  const { data: crm } = useQuery({ queryKey: ["clientes"], queryFn: () => carregarClientes() });

  const periodoDeUmDia = periodo.inicio === periodo.fim;

  return (
    <AdminShell title="Dashboard">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dash-periodo" className="text-xs text-muted-foreground">
              Período
            </Label>
            <Select value={preset} onValueChange={(v) => escolherPreset(v as PeriodoPreset)}>
              <SelectTrigger id="dash-periodo" className="h-11 w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {ROTULO_PERIODO[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === "personalizado" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dash-de" className="text-xs text-muted-foreground">
                  De
                </Label>
                <Input
                  id="dash-de"
                  type="date"
                  className="h-11"
                  value={periodo.inicio}
                  onChange={(e) =>
                    setPeriodo((p) => ({ ...p, inicio: e.target.value || p.inicio }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dash-ate" className="text-xs text-muted-foreground">
                  Até
                </Label>
                <Input
                  id="dash-ate"
                  type="date"
                  className="h-11"
                  value={periodo.fim}
                  min={periodo.inicio}
                  onChange={(e) => setPeriodo((p) => ({ ...p, fim: e.target.value || p.fim }))}
                />
              </div>
            </>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{formatarPeriodo(periodo)}</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando dados...</p>}
      {isError && (
        <p className="text-sm text-destructive">Não foi possível carregar os indicadores.</p>
      )}

      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Agendados" value={String(data.metricas.agendados)} />
            <Stat label="Confirmados" value={String(data.metricas.confirmados)} highlight />
            <Stat label="Receita prevista" value={moeda(data.metricas.receitaPrevista)} />
            <Stat label="Receita real" value={moeda(data.metricas.receitaReal)} highlight />
            <Stat label="Ocupação" value={`${data.metricas.ocupacao}%`} />
          </div>

          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Agendamentos no período</h2>
              <span className="text-xs text-muted-foreground">
                {data.agendamentosNoPeriodo.length}
                {data.agendamentosNoPeriodo.length >= 50 ? "+" : ""}
              </span>
            </div>
            {data.agendamentosNoPeriodo.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum agendamento nesse período.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {data.agendamentosNoPeriodo.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3 text-sm">
                    <span className="w-20 shrink-0 font-semibold">
                      {periodoDeUmDia
                        ? horaLocal(a.inicio)
                        : `${dataCurta(a.inicio)} ${horaLocal(a.inicio)}`}
                    </span>
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

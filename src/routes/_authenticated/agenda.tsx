import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PainelShell } from "@/components/PainelShell";
import { StatusTag } from "@/components/StatusTag";
import { atualizarStatus, listAgenda } from "@/lib/painel.functions";
import { NOMES_DIAS, dataLocal, horaLocal, moeda, somaDias } from "@/lib/tempo";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Minha Agenda · Cronica" },
      { name: "description", content: "Visualize seus horários por dia ou semana e mude status." },
      { property: "og:title", content: "Minha Agenda · Cronica" },
      { property: "og:description", content: "Horários do dia e da semana em um só quadro." },
    ],
  }),
  component: AgendaPage,
});

const PROXIMO: Record<string, "pendente" | "confirmado" | "cancelado" | "concluido"> = {
  pendente: "confirmado",
  confirmado: "concluido",
  concluido: "pendente",
  cancelado: "pendente",
};

function AgendaPage() {
  const carregar = useServerFn(listAgenda);
  const mudar = useServerFn(atualizarStatus);
  const qc = useQueryClient();
  const [modo, setModo] = useState<"dia" | "semana">("dia");
  const [base, setBase] = useState(() => dataLocal(new Date()));

  const de = modo === "dia" ? base : somaDias(base, -3);
  const ate = modo === "dia" ? base : somaDias(base, 3);

  const { data, isLoading } = useQuery({
    queryKey: ["agenda", de, ate],
    queryFn: () => carregar({ data: { de, ate } }),
  });

  const mStatus = useMutation({
    mutationFn: (v: { id: string; status: "pendente" | "confirmado" | "cancelado" | "concluido" }) =>
      mudar({ data: v }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dias = Array.from({ length: modo === "dia" ? 1 : 7 }, (_, i) => somaDias(de, i));

  return (
    <PainelShell empresaNome={data?.empresa.nome ?? "…"}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-inksoft uppercase">
            Minha agenda
          </p>
          <h1 className="mt-1 text-2xl text-balance font-display">Seu quadro de horários</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBase(somaDias(base, modo === "dia" ? -1 : -7))}
            className="rounded-md px-2.5 py-1 text-xs ring-1 ring-border"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setBase(dataLocal(new Date()))}
            className="rounded-md px-2.5 py-1 text-xs ring-1 ring-border"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setBase(somaDias(base, modo === "dia" ? 1 : 7))}
            className="rounded-md px-2.5 py-1 text-xs ring-1 ring-border"
          >
            →
          </button>
          <div className="ml-1 flex overflow-hidden rounded-md ring-1 ring-border">
            {(["dia", "semana"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={`px-2.5 py-1 text-xs ${modo === m ? "bg-brand text-cream" : "text-inksoft"}`}
              >
                {m === "dia" ? "Dia" : "Semana"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && <p className="mt-4 text-sm text-inksoft">Carregando…</p>}

      <div
        className={`mt-4 grid gap-2 ${modo === "semana" ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}
      >
        {dias.map((dia) => {
          const doDia = (data?.agendamentos ?? []).filter((a) => dataLocal(new Date(a.inicio)) === dia);
          const [, mes, d] = dia.split("-");
          const nomeDia = NOMES_DIAS[new Date(`${dia}T12:00:00-03:00`).getDay()];
          return (
            <div key={dia} className="rounded-lg bg-cream/50 p-3 ring-1 ring-border">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-sm font-medium">
                  {nomeDia} · {d}/{mes}
                </p>
                <span className="text-xs text-inksoft">{doDia.length} horários</span>
              </div>
              <div className="grid gap-1.5">
                {doDia.length === 0 && <p className="text-xs text-inksoft">Nenhum agendamento.</p>}
                {doDia.map((a) => (
                  <div key={a.id} className="rounded-md bg-paper p-2.5 ring-1 ring-border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold font-display">
                        {horaLocal(a.inicio)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{a.servico_nome}</span>
                      <StatusTag status={a.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-inksoft">
                      {a.cliente_nome} · {a.cliente_telefone}
                      {a.cliente_filiacao ? ` · ${a.cliente_filiacao}` : ""} ·{" "}
                      {moeda(a.servico_preco)}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          mStatus.mutate({ id: a.id, status: PROXIMO[a.status] ?? "confirmado" })
                        }
                        className="rounded-md px-2 py-0.5 text-xs text-branddeep ring-1 ring-border"
                      >
                        Avançar status
                      </button>
                      <button
                        type="button"
                        onClick={() => mStatus.mutate({ id: a.id, status: "cancelado" })}
                        className="rounded-md px-2 py-0.5 text-xs text-canc ring-1 ring-border"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PainelShell>
  );
}

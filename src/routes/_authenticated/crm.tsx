import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PainelShell } from "@/components/PainelShell";
import { StatusTag } from "@/components/StatusTag";
import { listClientes } from "@/lib/painel.functions";
import { dataCurta } from "@/lib/tempo";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({
    meta: [
      { title: "Clientes · CRM · Cronica" },
      {
        name: "description",
        content: "Contatos capturados no pré-cadastro, com histórico e busca por nome ou telefone.",
      },
      { property: "og:title", content: "Clientes · CRM · Cronica" },
      { property: "og:description", content: "Base de contatos com histórico de agendamentos." },
    ],
  }),
  component: CrmPage,
});

function CrmPage() {
  const carregar = useServerFn(listClientes);
  const { data, isLoading } = useQuery({ queryKey: ["clientes"], queryFn: () => carregar() });
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = data?.clientes ?? [];
    if (!q) return lista;
    return lista.filter((c) =>
      [c.nome, c.telefone, c.filiacao ?? "", c.email ?? ""].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [busca, data]);

  return (
    <PainelShell empresaNome={data?.empresa.nome ?? "…"}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-inksoft uppercase">CRM</p>
          <h1 className="mt-1 text-2xl text-balance font-display">Seus contatos</h1>
        </div>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, telefone ou filiação"
          className="w-full rounded-lg bg-cream/60 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-brand sm:w-72"
        />
      </div>

      {isLoading && <p className="mt-4 text-sm text-inksoft">Carregando…</p>}

      <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-border">
        <div className="hidden grid-cols-[1.3fr_1fr_1.2fr_0.7fr_0.9fr] gap-2 bg-cream/70 px-3 py-2 text-xs text-inksoft sm:grid">
          <span>Nome</span>
          <span>Telefone</span>
          <span>Filiação</span>
          <span>Visitas</span>
          <span>Último</span>
        </div>
        <div className="divide-y divide-border">
          {filtrados.length === 0 && !isLoading && (
            <p className="p-3 text-sm text-inksoft">Nenhum contato encontrado.</p>
          )}
          {filtrados.map((c) => (
            <div
              key={c.id}
              className="grid gap-1 bg-paper px-3 py-2.5 text-sm sm:grid-cols-[1.3fr_1fr_1.2fr_0.7fr_0.9fr] sm:items-center sm:gap-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{c.nome}</p>
                {c.email && <p className="truncate text-xs text-inksoft">{c.email}</p>}
              </div>
              <span className="text-inksoft">{c.telefone}</span>
              <span className="truncate text-inksoft">{c.filiacao ?? "—"}</span>
              <span className="text-inksoft">{c.total_agendamentos}</span>
              <div className="flex items-center gap-2">
                {c.ultimo_status ? <StatusTag status={c.ultimo_status} /> : null}
                <span className="text-xs text-inksoft">
                  {c.ultimo_em ? dataCurta(c.ultimo_em) : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PainelShell>
  );
}

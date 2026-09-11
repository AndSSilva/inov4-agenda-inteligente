import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { StatusTag } from "@/components/StatusTag";
import { Input } from "@/components/ui/input";
import { listClientes } from "@/lib/painel.functions";
import { dataCurta } from "@/lib/tempo";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes · Cronica" },
      {
        name: "description",
        content: "Contatos capturados no agendamento, com histórico e busca por nome ou telefone.",
      },
      { property: "og:title", content: "Clientes · Cronica" },
      { property: "og:description", content: "Base de contatos com histórico de agendamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
    <AdminShell title="Clientes">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data?.clientes.length ?? 0} contato(s) no total
        </p>
        <Input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar por nome, telefone ou filiação"
          className="h-12 w-full sm:w-72"
        />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {data && filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">Nenhum contato encontrado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Contatos aparecem aqui assim que alguém agenda pela sua agenda pública.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[1.3fr_1fr_1.2fr_0.7fr_0.9fr] gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground sm:grid">
            <span>Nome</span>
            <span>Telefone</span>
            <span>Filiação</span>
            <span>Visitas</span>
            <span>Último</span>
          </div>
          <ul className="divide-y divide-border">
            {filtrados.map((c) => (
              <li
                key={c.id}
                className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1.3fr_1fr_1.2fr_0.7fr_0.9fr] sm:items-center sm:gap-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.nome}</p>
                  {c.email && <p className="truncate text-xs text-muted-foreground">{c.email}</p>}
                </div>
                <span className="text-muted-foreground">{c.telefone}</span>
                <span className="truncate text-muted-foreground">{c.filiacao ?? "—"}</span>
                <span className="text-muted-foreground">{c.total_agendamentos}</span>
                <div className="flex items-center gap-2">
                  {c.ultimo_status ? <StatusTag status={c.ultimo_status} /> : null}
                  <span className="text-xs text-muted-foreground">
                    {c.ultimo_em ? dataCurta(c.ultimo_em) : "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminShell>
  );
}

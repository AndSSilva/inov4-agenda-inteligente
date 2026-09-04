import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PainelShell } from "@/components/PainelShell";
import { excluirServico, listServicos, salvarServico, type Servico } from "@/lib/painel.functions";
import { moeda } from "@/lib/tempo";

export const Route = createFileRoute("/_authenticated/servicos")({
  head: () => ({
    meta: [
      { title: "Tipos de Agenda · Cronica" },
      {
        name: "description",
        content: "Cadastre serviços com duração, preço e intervalo entre horários.",
      },
      { property: "og:title", content: "Tipos de Agenda · Cronica" },
      { property: "og:description", content: "Serviços, duração, preço e intervalo." },
    ],
  }),
  component: ServicosPage,
});

const VAZIO = { nome: "", duracao_min: 30, preco: 0, intervalo_min: 10, ativo: true };

function ServicosPage() {
  const carregar = useServerFn(listServicos);
  const salvar = useServerFn(salvarServico);
  const excluir = useServerFn(excluirServico);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["servicos"], queryFn: () => carregar() });
  const [form, setForm] = useState<Partial<Servico> & typeof VAZIO>({ ...VAZIO });

  const mSalvar = useMutation({
    mutationFn: (payload: Partial<Servico> & typeof VAZIO) =>
      salvar({
        data: {
          id: payload.id,
          nome: payload.nome,
          duracao_min: Number(payload.duracao_min),
          preco: Number(payload.preco),
          intervalo_min: Number(payload.intervalo_min),
          ativo: payload.ativo,
        },
      }),
    onSuccess: () => {
      toast.success("Serviço salvo");
      setForm({ ...VAZIO });
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mExcluir = useMutation({
    mutationFn: (id: string) => excluir({ data: { id } }),
    onSuccess: () => {
      toast.success("Serviço removido");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PainelShell empresaNome={data?.empresa.nome ?? "…"}>
      <p className="text-xs font-medium tracking-[0.14em] text-inksoft uppercase">
        Tipos de agenda
      </p>
      <h1 className="mt-1 text-2xl text-balance font-display">Serviços que o cliente pode marcar</h1>

      <form
        className="mt-4 grid gap-3 rounded-lg bg-cream/50 p-3 ring-1 ring-border sm:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (form.nome.trim().length < 2) {
            toast.error("Informe o nome do serviço");
            return;
          }
          mSalvar.mutate(form);
        }}
      >
        <Campo
          label="Nome"
          className="sm:col-span-2"
          value={form.nome}
          onChange={(v) => setForm({ ...form, nome: v })}
        />
        <Campo
          label="Duração (min)"
          type="number"
          value={String(form.duracao_min)}
          onChange={(v) => setForm({ ...form, duracao_min: Number(v) })}
        />
        <Campo
          label="Preço (R$)"
          type="number"
          value={String(form.preco)}
          onChange={(v) => setForm({ ...form, preco: Number(v) })}
        />
        <Campo
          label="Intervalo (min)"
          type="number"
          value={String(form.intervalo_min)}
          onChange={(v) => setForm({ ...form, intervalo_min: Number(v) })}
        />
        <div className="flex items-center gap-2 sm:col-span-5">
          <button
            type="submit"
            disabled={mSalvar.isPending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream shadow-slot ring-1 ring-brand disabled:opacity-60"
          >
            {form.id ? "Salvar alterações" : "Adicionar serviço"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm({ ...VAZIO })}
              className="text-xs text-inksoft hover:text-ink"
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      <div className="mt-4 grid gap-2">
        {isLoading && <p className="text-sm text-inksoft">Carregando…</p>}
        {(data?.servicos ?? []).map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center gap-3 rounded-lg bg-cream/50 p-3 ring-1 ring-border"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {s.nome} {!s.ativo && <span className="text-xs text-inksoft">(inativo)</span>}
              </p>
              <p className="text-xs text-inksoft">
                {s.duracao_min} min · {moeda(s.preco)} · intervalo {s.intervalo_min} min
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...s })}
              className="rounded-md px-2.5 py-1 text-xs text-branddeep ring-1 ring-border"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => mSalvar.mutate({ ...s, ativo: !s.ativo })}
              className="rounded-md px-2.5 py-1 text-xs text-inksoft ring-1 ring-border"
            >
              {s.ativo ? "Desativar" : "Ativar"}
            </button>
            <button
              type="button"
              onClick={() => mExcluir.mutate(s.id)}
              className="rounded-md px-2.5 py-1 text-xs text-canc ring-1 ring-border"
            >
              Excluir
            </button>
          </div>
        ))}
      </div>
    </PainelShell>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`grid gap-1 ${className}`}>
      <span className="text-xs text-inksoft">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg bg-paper px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-brand"
      />
    </label>
  );
}

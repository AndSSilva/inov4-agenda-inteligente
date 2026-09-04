import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PainelShell } from "@/components/PainelShell";
import { getEmpresa, salvarEmpresa } from "@/lib/painel.functions";
import { NOMES_DIAS } from "@/lib/tempo";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Cronica" },
      {
        name: "description",
        content: "Defina nome, link público, horário de funcionamento e dias de atendimento.",
      },
      { property: "og:title", content: "Configurações · Cronica" },
      { property: "og:description", content: "Link público e horários de atendimento." },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const carregar = useServerFn(getEmpresa);
  const salvar = useServerFn(salvarEmpresa);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["empresa"], queryFn: () => carregar() });

  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("18:00");
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    if (!data) return;
    setNome(data.nome);
    setSlug(data.slug);
    setHoraInicio(data.hora_inicio.slice(0, 5));
    setHoraFim(data.hora_fim.slice(0, 5));
    setDias(data.dias_semana);
  }, [data]);

  const mSalvar = useMutation({
    mutationFn: () =>
      salvar({
        data: {
          nome,
          slug,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          dias_semana: dias,
        },
      }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Configurações salvas");
        qc.invalidateQueries();
      } else {
        toast.error(res.erro);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const link = typeof window === "undefined" ? "" : `${window.location.origin}/agendar/${slug}`;

  return (
    <PainelShell empresaNome={data?.nome ?? "…"}>
      <p className="text-xs font-medium tracking-[0.14em] text-inksoft uppercase">Configurações</p>
      <h1 className="mt-1 text-2xl text-balance font-display">Sua empresa e link público</h1>

      <form
        className="mt-4 grid max-w-xl gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          mSalvar.mutate();
        }}
      >
        <label className="grid gap-1">
          <span className="text-xs text-inksoft">Nome do negócio</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="rounded-lg bg-cream/60 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-brand"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-inksoft">Slug do link público</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            className="rounded-lg bg-cream/60 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-brand"
          />
          <span className="truncate text-xs text-inksoft">{link}</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-inksoft">Abre às</span>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="rounded-lg bg-cream/60 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-brand"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-inksoft">Fecha às</span>
            <input
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
              className="rounded-lg bg-cream/60 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-brand"
            />
          </label>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-inksoft">Dias de atendimento</span>
          <div className="flex flex-wrap gap-1.5">
            {NOMES_DIAS.map((nomeDia, i) => {
              const on = dias.includes(i);
              return (
                <button
                  key={nomeDia}
                  type="button"
                  onClick={() =>
                    setDias(on ? dias.filter((d) => d !== i) : [...dias, i].sort((a, b) => a - b))
                  }
                  className={`rounded-md px-3 py-1.5 text-xs ring-1 ring-border ${
                    on ? "bg-brand text-cream" : "bg-cream/60 text-inksoft"
                  }`}
                >
                  {nomeDia}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="submit"
          disabled={mSalvar.isPending}
          className="mt-1 justify-self-start rounded-lg bg-brand px-4 py-2 text-sm font-medium text-cream shadow-slot ring-1 ring-brand disabled:opacity-60"
        >
          Salvar
        </button>
      </form>
    </PainelShell>
  );
}

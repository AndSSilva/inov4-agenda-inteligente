import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEmpresa, salvarEmpresa } from "@/lib/painel.functions";
import { NOMES_DIAS } from "@/lib/tempo";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Cronica" },
      {
        name: "description",
        content: "Defina nome, endereço, horário de funcionamento e dias de atendimento.",
      },
      { property: "og:title", content: "Configurações · Cronica" },
      { property: "og:description", content: "Endereço, link público e horários de atendimento." },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const carregar = useServerFn(getEmpresa);
  const salvar = useServerFn(salvarEmpresa);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["empresa-atual"], queryFn: () => carregar() });

  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("18:00");
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    if (!data) return;
    setNome(data.nome);
    setEndereco(data.endereco);
    setHoraInicio(data.hora_inicio.slice(0, 5));
    setHoraFim(data.hora_fim.slice(0, 5));
    setDias(data.dias_semana);
  }, [data]);

  const mSalvar = useMutation({
    mutationFn: () =>
      salvar({
        data: { nome, endereco, hora_inicio: horaInicio, hora_fim: horaFim, dias_semana: dias },
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

  const link =
    typeof window === "undefined" ? "" : `${window.location.origin}/${data?.slug ?? ""}`;

  return (
    <AdminShell title="Configurações">
      <form
        className="flex max-w-xl flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          mSalvar.mutate();
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="config-nome">Nome do negócio</Label>
          <Input
            id="config-nome"
            required
            className="h-12"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="config-endereco">Endereço da loja</Label>
          <Input
            id="config-endereco"
            placeholder="Rua, número, bairro, cidade"
            className="h-12"
            value={endereco}
            onChange={(event) => setEndereco(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="config-slug">Link público</Label>
          <Input id="config-slug" value={data?.slug ?? ""} disabled readOnly className="h-12" />
          <p className="text-xs text-muted-foreground">
            {link} · para alterar, fale com o administrador da plataforma
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="config-abre">Abre às</Label>
            <Input
              id="config-abre"
              type="time"
              className="h-12"
              value={horaInicio}
              onChange={(event) => setHoraInicio(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="config-fecha">Fecha às</Label>
            <Input
              id="config-fecha"
              type="time"
              className="h-12"
              value={horaFim}
              onChange={(event) => setHoraFim(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Dias de atendimento</Label>
          <div className="flex flex-wrap gap-1.5">
            {NOMES_DIAS.map((nomeDia, i) => {
              const ligado = dias.includes(i);
              return (
                <button
                  key={nomeDia}
                  type="button"
                  onClick={() =>
                    setDias(
                      ligado ? dias.filter((d) => d !== i) : [...dias, i].sort((a, b) => a - b),
                    )
                  }
                  className={`h-10 rounded-full px-4 text-sm font-medium transition-colors ${
                    ligado
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {nomeDia}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          type="submit"
          className="mt-1 h-12 w-full justify-self-start rounded-full sm:w-auto sm:px-8"
          disabled={mSalvar.isPending}
        >
          {mSalvar.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </AdminShell>
  );
}

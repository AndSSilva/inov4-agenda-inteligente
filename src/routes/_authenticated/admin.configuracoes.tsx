import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  criarBloqueio,
  excluirBloqueio,
  getEmpresa,
  listBloqueios,
  salvarEmpresa,
} from "@/lib/painel.functions";
import { NOMES_DIAS, dataCurta, horaLocal } from "@/lib/tempo";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Cronica" },
      {
        name: "description",
        content: "Endereço, horário de funcionamento, intervalo, feriados e bloqueios manuais.",
      },
      { property: "og:title", content: "Configurações · Cronica" },
      { property: "og:description", content: "Horários de atendimento e bloqueios da agenda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const carregar = useServerFn(getEmpresa);
  const salvar = useServerFn(salvarEmpresa);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["empresa-atual"], queryFn: () => carregar() });

  const [endereco, setEndereco] = useState("");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("18:00");
  const [temIntervalo, setTemIntervalo] = useState(false);
  const [intervaloInicio, setIntervaloInicio] = useState("12:00");
  const [intervaloFim, setIntervaloFim] = useState("13:00");
  const [atenderFeriados, setAtenderFeriados] = useState(false);
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    if (!data) return;
    setEndereco(data.endereco);
    setHoraInicio(data.hora_inicio.slice(0, 5));
    setHoraFim(data.hora_fim.slice(0, 5));
    setTemIntervalo(Boolean(data.intervalo_inicio && data.intervalo_fim));
    setIntervaloInicio(data.intervalo_inicio?.slice(0, 5) ?? "12:00");
    setIntervaloFim(data.intervalo_fim?.slice(0, 5) ?? "13:00");
    setAtenderFeriados(data.atender_feriados);
    setDias(data.dias_semana);
  }, [data]);

  const mSalvar = useMutation({
    mutationFn: () =>
      salvar({
        data: {
          endereco,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          intervalo_inicio: temIntervalo ? intervaloInicio : null,
          intervalo_fim: temIntervalo ? intervaloFim : null,
          atender_feriados: atenderFeriados,
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
          <Label htmlFor="config-endereco">Endereço da loja</Label>
          <Input
            id="config-endereco"
            placeholder="Rua, número, bairro, cidade"
            className="h-12"
            value={endereco}
            onChange={(event) => setEndereco(event.target.value)}
          />
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

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Horário de intervalo</p>
              <p className="text-xs text-muted-foreground">
                Ex: almoço — esse período não aparece como disponível na agenda pública.
              </p>
            </div>
            <Switch checked={temIntervalo} onCheckedChange={setTemIntervalo} />
          </div>
          {temIntervalo && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="config-intervalo-inicio">Início</Label>
                <Input
                  id="config-intervalo-inicio"
                  type="time"
                  className="h-12"
                  value={intervaloInicio}
                  onChange={(event) => setIntervaloInicio(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="config-intervalo-fim">Fim</Label>
                <Input
                  id="config-intervalo-fim"
                  type="time"
                  className="h-12"
                  value={intervaloFim}
                  onChange={(event) => setIntervaloFim(event.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Atender em feriados nacionais</p>
            <p className="text-xs text-muted-foreground">
              Desligado, a agenda fica bloqueada automaticamente nos feriados.
            </p>
          </div>
          <Switch checked={atenderFeriados} onCheckedChange={setAtenderFeriados} />
        </label>

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

      <div className="mt-8 max-w-xl">
        <BloqueiosSection />
      </div>
    </AdminShell>
  );
}

function BloqueiosSection() {
  const carregar = useServerFn(listBloqueios);
  const criar = useServerFn(criarBloqueio);
  const excluir = useServerFn(excluirBloqueio);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["bloqueios"], queryFn: () => carregar() });
  const [aberto, setAberto] = useState(false);

  const mExcluir = useMutation({
    mutationFn: (id: string) => excluir({ data: { id } }),
    onSuccess: () => {
      toast.success("Bloqueio removido");
      qc.invalidateQueries({ queryKey: ["bloqueios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Bloqueios da agenda</h2>
          <p className="text-xs text-muted-foreground">
            Folga, imprevisto, ou um cliente que vai precisar de mais tempo que o padrão.
          </p>
        </div>
        <Button className="h-11 shrink-0 rounded-full" onClick={() => setAberto(true)}>
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          Bloquear
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {data && data.bloqueios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <CalendarOff className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm text-muted-foreground">Nenhum bloqueio agendado.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {(data?.bloqueios ?? []).map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {dataCurta(b.inicio)} · {horaLocal(b.inicio)} às {horaLocal(b.fim)}
                </p>
                {b.motivo && <p className="truncate text-xs text-muted-foreground">{b.motivo}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full text-destructive hover:text-destructive"
                aria-label="Remover bloqueio"
                onClick={() => mExcluir.mutate(b.id)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <NovoBloqueioDialog
        open={aberto}
        onClose={() => setAberto(false)}
        onCriar={async (input) => {
          await criar({ data: input });
          qc.invalidateQueries({ queryKey: ["bloqueios"] });
        }}
      />
    </section>
  );
}

function NovoBloqueioDialog({
  open,
  onClose,
  onCriar,
}: {
  open: boolean;
  onClose: () => void;
  onCriar: (input: { inicio: string; fim: string; motivo: string }) => Promise<void>;
}) {
  const [dataDia, setDataDia] = useState("");
  const [horaInicio, setHoraInicio] = useState("12:00");
  const [horaFim, setHoraFim] = useState("13:00");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
          <DialogDescription>
            Esse período não aparece disponível na sua agenda pública.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!dataDia) {
              toast.error("Informe o dia");
              return;
            }
            const inicio = `${dataDia}T${horaInicio}:00-03:00`;
            const fim = `${dataDia}T${horaFim}:00-03:00`;
            if (new Date(fim) <= new Date(inicio)) {
              toast.error("O fim precisa ser depois do início");
              return;
            }
            setEnviando(true);
            try {
              await onCriar({ inicio, fim, motivo: motivo.trim() });
              toast.success("Bloqueio criado");
              setDataDia("");
              setMotivo("");
              onClose();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Não foi possível bloquear");
            } finally {
              setEnviando(false);
            }
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="bloqueio-dia">Dia</Label>
            <Input
              id="bloqueio-dia"
              type="date"
              required
              className="h-12"
              value={dataDia}
              onChange={(event) => setDataDia(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bloqueio-inicio">De</Label>
              <Input
                id="bloqueio-inicio"
                type="time"
                className="h-12"
                value={horaInicio}
                onChange={(event) => setHoraInicio(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bloqueio-fim">Até</Label>
              <Input
                id="bloqueio-fim"
                type="time"
                className="h-12"
                value={horaFim}
                onChange={(event) => setHoraFim(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bloqueio-motivo">Motivo (opcional)</Label>
            <Input
              id="bloqueio-motivo"
              placeholder="Ex: folga, cliente vai precisar de mais tempo..."
              className="h-12"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" className="h-12 rounded-full" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="h-12 rounded-full px-6" disabled={enviando}>
              {enviando ? "Salvando..." : "Bloquear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

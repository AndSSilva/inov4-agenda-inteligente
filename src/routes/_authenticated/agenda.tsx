import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, MessageCircleMore, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { StatusTag } from "@/components/StatusTag";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  agirAgendamento,
  listAgendamentosGestao,
  remarcarAgendamento,
  type AgendamentoItem,
} from "@/lib/painel.functions";
import { dataCurta, horaLocal, moeda } from "@/lib/tempo";
import {
  abrirWhatsApp,
  mensagemCancelamento,
  mensagemConfirmacao,
  mensagemLembrete,
  mensagemRemarcacao,
} from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agendamentos · Cronica" },
      {
        name: "description",
        content: "Confirme, lembre, cancele ou remarque agendamentos pelo WhatsApp.",
      },
      { property: "og:title", content: "Agendamentos · Cronica" },
      { property: "og:description", content: "Fila de agendamentos pendentes de ação." },
    ],
  }),
  component: AgendaPage,
});

function AgendaPage() {
  const carregar = useServerFn(listAgendamentosGestao);
  const agir = useServerFn(agirAgendamento);
  const remarcar = useServerFn(remarcarAgendamento);
  const qc = useQueryClient();
  const [remarcando, setRemarcando] = useState<AgendamentoItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["agendamentos-gestao"],
    queryFn: () => carregar(),
  });

  const mAgir = useMutation({
    mutationFn: (v: {
      id: string;
      acao: "confirmar" | "lembrete" | "cancelar" | "cliente_confirmou";
    }) => agir({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agendamentos-gestao"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const empresaNome = data?.empresa.nome ?? "";

  function confirmar(a: AgendamentoItem) {
    mAgir.mutate({ id: a.id, acao: "confirmar" });
    abrirWhatsApp(
      a.cliente_telefone,
      mensagemConfirmacao({
        clienteNome: a.cliente_nome,
        servicoNome: a.servico_nome,
        empresaNome,
        inicioIso: a.inicio,
      }),
    );
  }

  function enviarLembrete(a: AgendamentoItem) {
    mAgir.mutate({ id: a.id, acao: "lembrete" });
    abrirWhatsApp(
      a.cliente_telefone,
      mensagemLembrete({
        clienteNome: a.cliente_nome,
        servicoNome: a.servico_nome,
        empresaNome,
        inicioIso: a.inicio,
      }),
    );
  }

  function cancelar(a: AgendamentoItem) {
    mAgir.mutate({ id: a.id, acao: "cancelar" });
    abrirWhatsApp(
      a.cliente_telefone,
      mensagemCancelamento({
        clienteNome: a.cliente_nome,
        servicoNome: a.servico_nome,
        empresaNome,
        inicioIso: a.inicio,
      }),
    );
  }

  function clienteConfirmou(a: AgendamentoItem) {
    mAgir.mutate({ id: a.id, acao: "cliente_confirmou" });
    toast.success("Marcado como confirmado");
  }

  const mRemarcar = useMutation({
    mutationFn: (v: { id: string; novoInicio: string }) => remarcar({ data: v }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["agendamentos-gestao"] });
      if (remarcando) {
        abrirWhatsApp(
          remarcando.cliente_telefone,
          mensagemRemarcacao({
            clienteNome: remarcando.cliente_nome,
            servicoNome: remarcando.servico_nome,
            empresaNome,
            inicioIso: remarcando.inicio,
            novoInicioIso: res.novoInicio,
          }),
        );
      }
      setRemarcando(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pendentes = data?.pendentes ?? [];
  const aguardando = data?.aguardandoConfirmacao ?? [];

  return (
    <AdminShell title="Agendamentos">
      <p className="text-sm text-muted-foreground">
        Ações manuais: cada botão te leva direto pro WhatsApp do cliente com a mensagem pronta.
      </p>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>}

      {data && (
        <Tabs defaultValue="pendentes" className="mt-4">
          <TabsList>
            <TabsTrigger value="pendentes">Pendentes de ação ({pendentes.length})</TabsTrigger>
            <TabsTrigger value="aguardando">Aguardando cliente ({aguardando.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="mt-4">
            {pendentes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum agendamento pendente de ação.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pendentes.map((a) => (
                  <AgendamentoCard
                    key={a.id}
                    item={a}
                    acoes={
                      <>
                        <Button
                          className="h-10 rounded-full"
                          onClick={() => confirmar(a)}
                          disabled={mAgir.isPending}
                        >
                          <MessageCircleMore className="mr-1 h-4 w-4" aria-hidden />
                          Confirmar
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 rounded-full"
                          onClick={() => enviarLembrete(a)}
                          disabled={mAgir.isPending}
                        >
                          Enviar lembrete
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 rounded-full"
                          onClick={() => setRemarcando(a)}
                        >
                          <CalendarClock className="mr-1 h-4 w-4" aria-hidden />
                          Remarcar
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 rounded-full text-destructive hover:text-destructive"
                          onClick={() => cancelar(a)}
                          disabled={mAgir.isPending}
                        >
                          <X className="mr-1 h-4 w-4" aria-hidden />
                          Cancelar
                        </Button>
                      </>
                    }
                  />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="aguardando" className="mt-4">
            {aguardando.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum agendamento aguardando confirmação do cliente.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {aguardando.map((a) => (
                  <AgendamentoCard
                    key={a.id}
                    item={a}
                    rodape={
                      a.confirmacao_solicitada_em
                        ? `Pedido enviado em ${dataCurta(a.confirmacao_solicitada_em)} às ${horaLocal(a.confirmacao_solicitada_em)}`
                        : undefined
                    }
                    acoes={
                      <>
                        <Button
                          className="h-10 rounded-full"
                          onClick={() => clienteConfirmou(a)}
                          disabled={mAgir.isPending}
                        >
                          Cliente confirmou
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 rounded-full"
                          onClick={() => enviarLembrete(a)}
                          disabled={mAgir.isPending}
                        >
                          Enviar lembrete
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 rounded-full"
                          onClick={() => setRemarcando(a)}
                        >
                          <CalendarClock className="mr-1 h-4 w-4" aria-hidden />
                          Remarcar
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 rounded-full text-destructive hover:text-destructive"
                          onClick={() => cancelar(a)}
                          disabled={mAgir.isPending}
                        >
                          <X className="mr-1 h-4 w-4" aria-hidden />
                          Cancelar
                        </Button>
                      </>
                    }
                  />
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}

      <RemarcarDialog
        item={remarcando}
        pending={mRemarcar.isPending}
        onClose={() => setRemarcando(null)}
        onConfirm={(novoInicio) => {
          if (!remarcando) return;
          mRemarcar.mutate({ id: remarcando.id, novoInicio });
        }}
      />
    </AdminShell>
  );
}

function AgendamentoCard({
  item,
  acoes,
  rodape,
}: {
  item: AgendamentoItem;
  acoes: React.ReactNode;
  rodape?: string | undefined;
}) {
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">
              {dataCurta(item.inicio)} · {horaLocal(item.inicio)}
            </span>
            <StatusTag status={item.status} />
          </div>
          <p className="mt-1 truncate text-sm font-medium">{item.servico_nome}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.cliente_nome} · {item.cliente_telefone}
            {item.cliente_filiacao ? ` · ${item.cliente_filiacao}` : ""} ·{" "}
            {moeda(item.servico_preco)}
          </p>
          {rodape && <p className="mt-1 text-xs text-muted-foreground">{rodape}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{acoes}</div>
    </li>
  );
}

function RemarcarDialog({
  item,
  pending,
  onClose,
  onConfirm,
}: {
  item: AgendamentoItem | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (novoInicioIsoLocal: string) => void;
}) {
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [key, setKey] = useState<string | null>(null);

  if (item && item.id !== key) {
    setKey(item.id);
    const d = new Date(item.inicio);
    setData(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d));
    setHora(
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d),
    );
  }

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remarcar agendamento</DialogTitle>
          <DialogDescription>
            Escolha o novo dia e horário para {item?.cliente_nome}. Ao salvar, você será direcionado
            ao WhatsApp com a nova data pronta pra enviar.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!data || !hora) {
              toast.error("Informe data e horário");
              return;
            }
            onConfirm(`${data}T${hora}:00-03:00`);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="remarcar-data">Novo dia</Label>
              <Input
                id="remarcar-data"
                type="date"
                required
                className="h-12"
                value={data}
                onChange={(event) => setData(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="remarcar-hora">Novo horário</Label>
              <Input
                id="remarcar-hora"
                type="time"
                required
                className="h-12"
                value={hora}
                onChange={(event) => setHora(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" className="h-12 rounded-full" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="h-12 rounded-full px-6" disabled={pending}>
              {pending ? "Salvando..." : "Salvar e avisar no WhatsApp"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { excluirServico, listServicos, salvarServico, type Servico } from "@/lib/painel.functions";
import { moeda } from "@/lib/tempo";

export const Route = createFileRoute("/_authenticated/admin/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro · Cronica" },
      {
        name: "description",
        content: "Cadastre serviços com duração, preço e intervalo entre horários.",
      },
      { property: "og:title", content: "Cadastro · Cronica" },
      { property: "og:description", content: "Serviços, duração, preço e intervalo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServicosPage,
});

function ServicosPage() {
  const carregar = useServerFn(listServicos);
  const excluir = useServerFn(excluirServico);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["servicos"], queryFn: () => carregar() });
  const [form, setForm] = useState<Servico | "new" | null>(null);
  const [remover, setRemover] = useState<Servico | null>(null);

  const salvar = useServerFn(salvarServico);
  const mAtivo = useMutation({
    mutationFn: (s: Servico) => salvar({ data: { ...s } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servicos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const mExcluir = useMutation({
    mutationFn: (id: string) => excluir({ data: { id } }),
    onSuccess: () => {
      toast.success("Serviço removido");
      qc.invalidateQueries({ queryKey: ["servicos"] });
      setRemover(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell title="Cadastro">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data?.servicos.length ?? 0} serviço(s) cadastrado(s)
        </p>
        <Button className="h-12 w-full rounded-full px-5 sm:w-auto" onClick={() => setForm("new")}>
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          Novo serviço
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {data && data.servicos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">Nenhum serviço ainda</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre o primeiro serviço para liberar sua agenda pública.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {(data?.servicos ?? []).map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {s.nome}{" "}
                  {!s.ativo && <span className="text-xs text-muted-foreground">(inativo)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.duracao_min} min · {moeda(s.preco)} · intervalo {s.intervalo_min} min
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <Switch
                    checked={s.ativo}
                    onCheckedChange={(checked) => mAtivo.mutate({ ...s, ativo: checked })}
                    aria-label={`Ativar ${s.nome}`}
                  />
                  {s.ativo ? "Ativo" : "Inativo"}
                </label>
                <Button variant="outline" className="h-11 rounded-full" onClick={() => setForm(s)}>
                  <Pencil className="mr-1 h-4 w-4" aria-hidden />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-full text-destructive hover:text-destructive"
                  onClick={() => setRemover(s)}
                >
                  <Trash2 className="mr-1 h-4 w-4" aria-hidden />
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ServicoDialog servico={form} onClose={() => setForm(null)} />

      <Dialog
        open={Boolean(remover)}
        onOpenChange={(open) => (!open ? setRemover(null) : undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir serviço</DialogTitle>
            <DialogDescription>
              Isso remove "{remover?.nome}" do cadastro. Agendamentos já feitos com esse serviço não
              são afetados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" className="h-12 rounded-full" onClick={() => setRemover(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="h-12 rounded-full px-6"
              disabled={mExcluir.isPending}
              onClick={() => remover && mExcluir.mutate(remover.id)}
            >
              {mExcluir.isPending ? "Removendo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

const VAZIO = { nome: "", duracao_min: 30, preco: 0, intervalo_min: 10, ativo: true };

function ServicoDialog({
  servico,
  onClose,
}: {
  servico: Servico | "new" | null;
  onClose: () => void;
}) {
  const salvar = useServerFn(salvarServico);
  const qc = useQueryClient();
  const editando = servico && servico !== "new" ? servico : null;

  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState(30);
  const [preco, setPreco] = useState(0);
  const [intervalo, setIntervalo] = useState(10);
  const [ativo, setAtivo] = useState(true);
  const [key, setKey] = useState<string | null>(null);

  const currentKey = servico === "new" ? "new" : (editando?.id ?? null);
  if (servico && currentKey !== key) {
    setKey(currentKey);
    setNome(editando?.nome ?? VAZIO.nome);
    setDuracao(editando?.duracao_min ?? VAZIO.duracao_min);
    setPreco(editando?.preco ?? VAZIO.preco);
    setIntervalo(editando?.intervalo_min ?? VAZIO.intervalo_min);
    setAtivo(editando?.ativo ?? VAZIO.ativo);
  }

  const mSalvar = useMutation({
    mutationFn: () =>
      salvar({
        data: {
          ...(editando ? { id: editando.id } : {}),
          nome: nome.trim(),
          duracao_min: duracao,
          preco,
          intervalo_min: intervalo,
          ativo,
        },
      }),
    onSuccess: () => {
      toast.success(editando ? "Serviço atualizado" : "Serviço criado");
      qc.invalidateQueries({ queryKey: ["servicos"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={Boolean(servico)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          <DialogDescription>Isso aparece pro cliente na sua agenda pública.</DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (nome.trim().length < 2) {
              toast.error("Informe o nome do serviço");
              return;
            }
            mSalvar.mutate();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="servico-nome">Nome</Label>
            <Input
              id="servico-nome"
              required
              className="h-12"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="servico-duracao">Duração (min)</Label>
              <Input
                id="servico-duracao"
                type="number"
                min={5}
                max={600}
                required
                className="h-12"
                value={duracao}
                onChange={(event) => setDuracao(Number(event.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="servico-intervalo">Intervalo (min)</Label>
              <Input
                id="servico-intervalo"
                type="number"
                min={0}
                max={240}
                required
                className="h-12"
                value={intervalo}
                onChange={(event) => setIntervalo(Number(event.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="servico-preco">Preço (R$)</Label>
            <Input
              id="servico-preco"
              type="number"
              min={0}
              step="0.01"
              required
              className="h-12"
              value={preco}
              onChange={(event) => setPreco(Number(event.target.value))}
            />
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span className="text-sm font-medium">Serviço ativo</span>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" className="h-12 rounded-full" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="h-12 rounded-full px-6" disabled={mSalvar.isPending}>
              {mSalvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

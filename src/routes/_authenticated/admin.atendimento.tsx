import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  PawPrint,
  PlayCircle,
  Stethoscope,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmarEntrega,
  confirmarPagamento,
  getFicha,
  iniciarAtendimento,
  listFichaAtendimento,
  listHistorico,
  listPetsDoCliente,
  listSala,
  listTriagem,
  salvarFicha,
  type ItemTriagem,
  type PetResumo,
} from "@/lib/atendimento.functions";
import { ROTULO_STATUS, dataCurta, horaLocal, moeda } from "@/lib/tempo";

export const Route = createFileRoute("/_authenticated/admin/atendimento")({
  head: () => ({
    meta: [
      { title: "Atendimento · Cronica" },
      {
        name: "description",
        content: "Triagem, ficha de atendimento do pet e sala de checkout.",
      },
      { property: "og:title", content: "Atendimento · Cronica" },
      { property: "og:description", content: "Fluxo de triagem, ficha e sala." },
    ],
  }),
  component: AtendimentoPage,
});

const TIPO_PET_LABELS: Record<string, string> = {
  cachorro: "Cachorro",
  gato: "Gato",
  ave: "Ave",
  roedor: "Roedor",
  reptil: "Réptil",
  outro: "Outro",
};

function AtendimentoPage() {
  return (
    <AdminShell title="Atendimento">
      <Tabs defaultValue="triagem">
        <TabsList>
          <TabsTrigger value="triagem">Triagem</TabsTrigger>
          <TabsTrigger value="ficha">Ficha de atendimento</TabsTrigger>
          <TabsTrigger value="sala">Sala</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="triagem" className="mt-4">
          <TriagemTab />
        </TabsContent>
        <TabsContent value="ficha" className="mt-4">
          <FichaTab />
        </TabsContent>
        <TabsContent value="sala" className="mt-4">
          <SalaTab />
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <HistoricoTab />
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

// ---------------------------------------------------------------------------
// Triagem
// ---------------------------------------------------------------------------

function TriagemTab() {
  const carregar = useServerFn(listTriagem);
  const iniciar = useServerFn(iniciarAtendimento);
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<string>("todos");

  const { data, isLoading } = useQuery({ queryKey: ["triagem"], queryFn: () => carregar() });

  const mIniciar = useMutation({
    mutationFn: (agendamentoId: string) => iniciar({ data: { agendamentoId } }),
    onSuccess: () => {
      toast.success("Atendimento iniciado");
      qc.invalidateQueries({ queryKey: ["triagem"] });
      qc.invalidateQueries({ queryKey: ["ficha-lista"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const itens = (data ?? []).filter((i: ItemTriagem) => filtro === "todos" || i.status === filtro);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Label htmlFor="triagem-filtro" className="shrink-0 text-sm">
          Status
        </Label>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger id="triagem-filtro" className="h-11 w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {Object.entries(ROTULO_STATUS).map(([valor, label]) => (
              <SelectItem key={valor} value={valor}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum agendamento nessa triagem.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {itens.map((item) => (
            <li
              key={item.agendamentoId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {dataCurta(item.inicio)} · {horaLocal(item.inicio)}
                  </span>
                  <StatusTag status={item.status} />
                </div>
                <p className="mt-1 truncate text-sm font-medium">{item.servicoNome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.clienteNome} · {item.clienteTelefone}
                  {item.petNome ? ` · ${item.petNome}` : ""}
                </p>
              </div>
              <Button
                className="h-10 rounded-full"
                disabled={mIniciar.isPending}
                onClick={() => mIniciar.mutate(item.agendamentoId)}
              >
                <PlayCircle className="mr-1 h-4 w-4" aria-hidden />
                Iniciar atendimento
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ficha de atendimento
// ---------------------------------------------------------------------------

function FichaTab() {
  const carregar = useServerFn(listFichaAtendimento);
  const qc = useQueryClient();
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["ficha-lista"], queryFn: () => carregar() });

  return (
    <div className="flex flex-col gap-4">
      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && (data ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum atendimento em andamento.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(data ?? []).map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold">{item.petNome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.clienteNome} · {item.servicoNome}
                  {item.inicio ? ` · ${dataCurta(item.inicio)} ${horaLocal(item.inicio)}` : ""}
                </p>
              </div>
              <Button
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => setAbertoId(item.id)}
              >
                <ClipboardCheck className="mr-1 h-4 w-4" aria-hidden />
                Preencher ficha
              </Button>
            </li>
          ))}
        </ul>
      )}

      <FichaDialog
        id={abertoId}
        onClose={() => setAbertoId(null)}
        onSalvo={() => {
          qc.invalidateQueries({ queryKey: ["ficha-lista"] });
          qc.invalidateQueries({ queryKey: ["sala"] });
        }}
      />
    </div>
  );
}

function FichaDialog({
  id,
  onClose,
  onSalvo,
}: {
  id: string | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const carregar = useServerFn(getFicha);
  const salvar = useServerFn(salvarFicha);
  const carregarPets = useServerFn(listPetsDoCliente);
  const { data: ficha, isLoading } = useQuery({
    queryKey: ["ficha", id],
    queryFn: () => carregar({ data: { id: id! } }),
    enabled: Boolean(id),
  });

  const [petNome, setPetNome] = useState("");
  const [petTipo, setPetTipo] = useState<string | null>(null);
  const [sexo, setSexo] = useState<string | null>(null);
  const [nascimento, setNascimento] = useState("");
  const [peso, setPeso] = useState("");
  const [cadastrado, setCadastrado] = useState(false);
  const [temperamento, setTemperamento] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [petIdEscolhido, setPetIdEscolhido] = useState<string | null>(null);
  const [escolhaFeita, setEscolhaFeita] = useState(false);

  const { data: petsDoCliente, isLoading: carregandoPets } = useQuery({
    queryKey: ["pets-cliente", ficha?.clienteId],
    queryFn: () => carregarPets({ data: { clienteId: ficha!.clienteId } }),
    enabled: Boolean(ficha && !ficha.petId),
  });

  // Reseta o passo de escolha sempre que abre uma ficha diferente.
  useEffect(() => {
    setEscolhaFeita(false);
    setPetIdEscolhido(null);
  }, [id]);

  const precisaEscolher = Boolean(
    ficha && !ficha.petId && !escolhaFeita && (petsDoCliente ?? []).length > 0,
  );

  function escolherPet(pet: PetResumo) {
    setPetNome(pet.nome);
    setPetTipo(pet.tipo);
    setSexo(pet.sexo);
    setNascimento(pet.nascimento ?? "");
    setPeso(pet.peso === null ? "" : String(pet.peso));
    setCadastrado(pet.cadastrado);
    setTemperamento(pet.temperamento);
    setObservacao(pet.observacao ?? "");
    setFotoPreview(pet.fotoUrl);
    setPetIdEscolhido(pet.id);
    setEscolhaFeita(true);
  }

  function escolherOutroAnimal() {
    setPetIdEscolhido(null);
    setEscolhaFeita(true);
  }

  useEffect(() => {
    if (!ficha) return;
    setPetNome(ficha.petNome);
    setPetTipo(ficha.petTipo);
    setSexo(ficha.sexo);
    setNascimento(ficha.nascimento ?? "");
    setPeso(ficha.peso === null ? "" : String(ficha.peso));
    setCadastrado(ficha.cadastrado);
    setTemperamento(ficha.temperamento);
    setObservacao(ficha.observacao ?? "");
    setFotoFile(null);
    setFotoPreview(ficha.fotoUrl);
    if (ficha.petId) {
      setPetIdEscolhido(ficha.petId);
      setEscolhaFeita(true);
    }
  }, [ficha]);

  async function codificarFoto(file: File) {
    const buffer = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (const byte of buffer) binary += String.fromCharCode(byte);
    return {
      base64: btoa(binary),
      contentType: file.type || "image/jpeg",
      extension: (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5),
    };
  }

  async function salvarClick() {
    if (!id) return;
    if (petNome.trim().length < 1) {
      toast.error("Informe o nome do pet");
      return;
    }
    if (fotoFile && fotoFile.size > 4_000_000) {
      toast.error("A foto deve ter no máximo 4 MB");
      return;
    }
    setSalvando(true);
    try {
      const foto = fotoFile ? await codificarFoto(fotoFile) : null;
      await salvar({
        data: {
          id,
          petId: petIdEscolhido,
          petNome: petNome.trim(),
          petTipo: petTipo as "cachorro" | "gato" | "ave" | "roedor" | "reptil" | "outro" | null,
          sexo: sexo as "macho" | "femea" | null,
          nascimento: nascimento || null,
          peso: peso ? Number(peso) : null,
          cadastrado,
          temperamento: temperamento as "manso" | "bravo" | null,
          observacao,
          foto,
        },
      });
      toast.success("Ficha salva — atendimento finalizado");
      onSalvo();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={Boolean(id)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ficha de atendimento</DialogTitle>
          <DialogDescription>
            {ficha ? `${ficha.clienteNome} · ${ficha.servicoNome}` : "Carregando..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading || (ficha && !ficha.petId && carregandoPets) ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : precisaEscolher ? (
          <div className="flex flex-col gap-3">
            {(petsDoCliente ?? []).length === 1 ? (
              <p className="text-sm text-muted-foreground">
                {ficha?.clienteNome} já tem um pet cadastrado. É o mesmo animal desta visita?
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {ficha?.clienteNome} já tem {(petsDoCliente ?? []).length} pets cadastrados.
                Selecione um, ou cadastre um novo.
              </p>
            )}

            <div className="flex flex-col gap-2">
              {(petsDoCliente ?? []).map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => escolherPet(pet)}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-accent"
                >
                  {pet.fotoUrl ? (
                    <img
                      src={pet.fotoUrl}
                      alt={pet.nome}
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <PawPrint className="h-5 w-5" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{pet.nome || "Sem nome"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {pet.tipo ? TIPO_PET_LABELS[pet.tipo] : "Tipo não informado"}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {(petsDoCliente ?? []).length === 1 ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="h-11 flex-1 rounded-full"
                  onClick={() => escolherPet((petsDoCliente ?? [])[0]!)}
                >
                  Sim, é o mesmo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-full"
                  onClick={escolherOutroAnimal}
                >
                  Não, é outro animal
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full"
                onClick={escolherOutroAnimal}
              >
                Cadastrar outro animal
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2">
              {fotoPreview ? (
                <img
                  src={fotoPreview}
                  alt="Foto do pet"
                  className="h-32 w-32 rounded-2xl object-cover ring-1 ring-border"
                />
              ) : (
                <span className="grid h-32 w-32 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <Camera className="h-8 w-8" aria-hidden />
                </span>
              )}
              <Label
                htmlFor="ficha-foto"
                className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                {fotoPreview ? "Trocar foto" : "Tirar foto ou enviar arquivo"}
              </Label>
              <input
                id="ficha-foto"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setFotoFile(file);
                  if (file) setFotoPreview(URL.createObjectURL(file));
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ficha-nome">Nome do pet</Label>
              <Input
                id="ficha-nome"
                className="h-12"
                value={petNome}
                onChange={(event) => setPetNome(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ficha-tipo">Tipo</Label>
                <Select value={petTipo ?? ""} onValueChange={setPetTipo}>
                  <SelectTrigger id="ficha-tipo" className="h-12">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_PET_LABELS).map(([valor, label]) => (
                      <SelectItem key={valor} value={valor}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Sexo</Label>
                <div className="flex gap-2">
                  {[
                    { valor: "macho", label: "Macho" },
                    { valor: "femea", label: "Fêmea" },
                  ].map((opcao) => (
                    <button
                      key={opcao.valor}
                      type="button"
                      onClick={() => setSexo(opcao.valor)}
                      className={`h-12 flex-1 rounded-lg text-sm font-medium ring-1 ring-border ${
                        sexo === opcao.valor
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-accent"
                      }`}
                    >
                      {opcao.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ficha-nascimento">Nascimento</Label>
                <Input
                  id="ficha-nascimento"
                  type="date"
                  className="h-12"
                  value={nascimento}
                  onChange={(event) => setNascimento(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ficha-peso">Peso (kg)</Label>
                <Input
                  id="ficha-peso"
                  type="number"
                  min={0}
                  step="0.1"
                  className="h-12"
                  value={peso}
                  onChange={(event) => setPeso(event.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <span className="text-sm font-medium">Cadastrado</span>
                <Switch checked={cadastrado} onCheckedChange={setCadastrado} />
              </label>
              <div className="flex flex-col gap-2">
                <Label>Temperamento</Label>
                <div className="flex gap-2">
                  {[
                    { valor: "manso", label: "Manso" },
                    { valor: "bravo", label: "Bravo" },
                  ].map((opcao) => (
                    <button
                      key={opcao.valor}
                      type="button"
                      onClick={() => setTemperamento(opcao.valor)}
                      className={`h-11 flex-1 rounded-lg text-sm font-medium ring-1 ring-border ${
                        temperamento === opcao.valor
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-accent"
                      }`}
                    >
                      {opcao.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ficha-obs">Observação</Label>
              <Textarea
                id="ficha-obs"
                rows={3}
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" className="h-12 rounded-full" onClick={onClose}>
            Cancelar
          </Button>
          {!precisaEscolher && (
            <Button
              type="button"
              className="h-12 rounded-full px-6"
              disabled={salvando || isLoading}
              onClick={salvarClick}
            >
              {salvando ? "Salvando..." : "Salvar e finalizar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sala
// ---------------------------------------------------------------------------

function SalaTab() {
  const carregar = useServerFn(listSala);
  const qc = useQueryClient();
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["sala"], queryFn: () => carregar() });

  const item = (data ?? []).find((i) => i.id === abertoId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && (data ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum atendimento aguardando checkout.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(data ?? []).map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold">{i.petNome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {i.clienteNome} · {i.servicoNome} · {moeda(i.servicoPreco)}
                </p>
                <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 ${i.pagamentoConfirmado ? "bg-conf/15 text-conf" : "bg-muted text-muted-foreground"}`}
                  >
                    {i.pagamentoConfirmado ? "Pago" : "Pagamento pendente"}
                  </span>
                </p>
              </div>
              <Button
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => setAbertoId(i.id)}
              >
                <DoorOpen className="mr-1 h-4 w-4" aria-hidden />
                Checkout
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(item)} onOpenChange={(open) => (!open ? setAbertoId(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              {item ? `${item.petNome} · ${item.clienteNome}` : ""}
            </DialogDescription>
          </DialogHeader>

          {item && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border p-3 text-sm">
                <p className="font-medium">{item.servicoNome}</p>
                <p className="text-muted-foreground">{moeda(item.servicoPreco)}</p>
              </div>

              <CheckoutAcoes
                item={item}
                onAtualizar={() => qc.invalidateQueries({ queryKey: ["sala"] })}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" className="h-12 rounded-full" onClick={() => setAbertoId(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckoutAcoes({
  item,
  onAtualizar,
}: {
  item: { id: string; pagamentoConfirmado: boolean; entregaConfirmada: boolean };
  onAtualizar: () => void;
}) {
  const pagar = useServerFn(confirmarPagamento);
  const entregar = useServerFn(confirmarEntrega);

  const mPagar = useMutation({
    mutationFn: () => pagar({ data: { id: item.id } }),
    onSuccess: () => {
      toast.success("Pagamento confirmado");
      onAtualizar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mEntregar = useMutation({
    mutationFn: () => entregar({ data: { id: item.id } }),
    onSuccess: () => {
      toast.success("Entrega confirmada");
      onAtualizar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-2">
      <Button
        className="h-12 rounded-full"
        variant={item.pagamentoConfirmado ? "outline" : "default"}
        disabled={item.pagamentoConfirmado || mPagar.isPending}
        onClick={() => mPagar.mutate()}
      >
        <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden />
        {item.pagamentoConfirmado ? "Pagamento confirmado" : "Confirmar pagamento"}
      </Button>
      <Button
        className="h-12 rounded-full"
        disabled={!item.pagamentoConfirmado || mEntregar.isPending}
        onClick={() => mEntregar.mutate()}
      >
        <Stethoscope className="mr-1 h-4 w-4" aria-hidden />
        Confirmar entrega pro tutor
      </Button>
      {!item.pagamentoConfirmado && (
        <p className="text-center text-xs text-muted-foreground">
          Confirme o pagamento antes de liberar a entrega.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------------

function HistoricoTab() {
  const carregar = useServerFn(listHistorico);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["historico"], queryFn: () => carregar() });

  return (
    <div className="flex flex-col gap-4">
      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && (data ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma ficha finalizada ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(data ?? []).map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold">{i.petNome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {i.clienteNome} · {i.servicoNome}
                  {i.finalizadoEm
                    ? ` · ${dataCurta(i.finalizadoEm)} ${horaLocal(i.finalizadoEm)}`
                    : ""}
                </p>
              </div>
              <Button
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => setAbertoId(i.id)}
              >
                Ver ficha
              </Button>
            </li>
          ))}
        </ul>
      )}

      <HistoricoDetalheDialog id={abertoId} onClose={() => setAbertoId(null)} />
    </div>
  );
}

function HistoricoDetalheDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const carregar = useServerFn(getFicha);
  const { data: ficha, isLoading } = useQuery({
    queryKey: ["ficha", id],
    queryFn: () => carregar({ data: { id: id! } }),
    enabled: Boolean(id),
  });

  return (
    <Dialog open={Boolean(id)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ficha de atendimento</DialogTitle>
          <DialogDescription>
            {ficha ? `${ficha.clienteNome} · ${ficha.servicoNome}` : "Carregando..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !ficha ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex justify-center">
              {ficha.fotoUrl ? (
                <img
                  src={ficha.fotoUrl}
                  alt={`Foto de ${ficha.petNome}`}
                  className="h-32 w-32 rounded-2xl object-cover ring-1 ring-border"
                />
              ) : (
                <span className="grid h-32 w-32 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <Camera className="h-8 w-8" aria-hidden />
                </span>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Campo label="Nome do pet" valor={ficha.petNome} />
              <Campo
                label="Tipo"
                valor={ficha.petTipo ? (TIPO_PET_LABELS[ficha.petTipo] ?? "—") : "—"}
              />
              <Campo
                label="Sexo"
                valor={ficha.sexo === "macho" ? "Macho" : ficha.sexo === "femea" ? "Fêmea" : "—"}
              />
              <Campo label="Nascimento" valor={ficha.nascimento ?? "—"} />
              <Campo label="Peso" valor={ficha.peso === null ? "—" : `${ficha.peso} kg`} />
              <Campo label="Cadastrado" valor={ficha.cadastrado ? "Sim" : "Não"} />
              <Campo
                label="Temperamento"
                valor={
                  ficha.temperamento === "manso"
                    ? "Manso"
                    : ficha.temperamento === "bravo"
                      ? "Bravo"
                      : "—"
                }
              />
            </dl>
            {ficha.observacao && (
              <div>
                <dt className="text-xs text-muted-foreground">Observação</dt>
                <dd className="text-sm">{ficha.observacao}</dd>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" className="h-12 rounded-full" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{valor}</dd>
    </div>
  );
}

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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  listHistoricoPet,
  listPetsComHistorico,
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
  const [aba, setAba] = useState("triagem");
  const [pendingFichaId, setPendingFichaId] = useState<string | null>(null);

  return (
    <AdminShell title="Atendimento">
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="triagem">Triagem</TabsTrigger>
          <TabsTrigger value="ficha">Ficha de atendimento</TabsTrigger>
          <TabsTrigger value="sala">Sala</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="triagem" className="mt-4">
          <TriagemTab
            onAbrirFicha={(atendimentoId) => {
              setPendingFichaId(atendimentoId);
              setAba("ficha");
            }}
          />
        </TabsContent>
        <TabsContent value="ficha" className="mt-4">
          <FichaTab
            pendingAbrirId={pendingFichaId}
            onPendingConsumido={() => setPendingFichaId(null)}
          />
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

function TriagemTab({ onAbrirFicha }: { onAbrirFicha: (atendimentoId: string) => void }) {
  const carregar = useServerFn(listTriagem);
  const iniciar = useServerFn(iniciarAtendimento);
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<string>("todos");
  const [mostrarIniciados, setMostrarIniciados] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["triagem"], queryFn: () => carregar() });

  const mIniciar = useMutation({
    mutationFn: (agendamentoId: string) => iniciar({ data: { agendamentoId } }),
    onSuccess: (res) => {
      toast.success("Atendimento iniciado");
      qc.invalidateQueries({ queryKey: ["triagem"] });
      qc.invalidateQueries({ queryKey: ["ficha-lista"] });
      onAbrirFicha(res.atendimentoId);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const itens = (data ?? [])
    .filter((i: ItemTriagem) => filtro === "todos" || i.status === filtro)
    .filter((i: ItemTriagem) => mostrarIniciados || i.atendimentoId === null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
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

        <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={mostrarIniciados} onCheckedChange={setMostrarIniciados} />
          Mostrar já iniciados
        </label>
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
                  {item.etapaAtendimento && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {item.etapaAtendimento === "finalizado" ? "Finalizado" : "Em atendimento"}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-medium">{item.servicoNome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.clienteNome} · {item.clienteTelefone}
                  {item.petNome ? ` · ${item.petNome}` : ""}
                </p>
              </div>
              {item.atendimentoId ? (
                <Button
                  variant="outline"
                  className="h-10 rounded-full"
                  onClick={() => onAbrirFicha(item.atendimentoId!)}
                >
                  <ClipboardCheck className="mr-1 h-4 w-4" aria-hidden />
                  Ver ficha
                </Button>
              ) : (
                <Button
                  className="h-10 rounded-full"
                  disabled={mIniciar.isPending}
                  onClick={() => mIniciar.mutate(item.agendamentoId)}
                >
                  <PlayCircle className="mr-1 h-4 w-4" aria-hidden />
                  Iniciar atendimento
                </Button>
              )}
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

function FichaTab({
  pendingAbrirId,
  onPendingConsumido,
}: {
  pendingAbrirId: string | null;
  onPendingConsumido: () => void;
}) {
  const carregar = useServerFn(listFichaAtendimento);
  const qc = useQueryClient();
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["ficha-lista"], queryFn: () => carregar() });

  useEffect(() => {
    if (!pendingAbrirId) return;
    setAbertoId(pendingAbrirId);
    onPendingConsumido();
  }, [pendingAbrirId, onPendingConsumido]);

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
  const carregarHistPet = useServerFn(listHistoricoPet);
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
  const [passo, setPasso] = useState<
    "carregando" | "selecionar-pet" | "escolher-historico" | "ver-historico" | "form"
  >("carregando");
  const [petAtual, setPetAtual] = useState<PetResumo | null>(null);

  const { data: petsDoCliente, isLoading: carregandoPets } = useQuery({
    queryKey: ["pets-cliente", ficha?.clienteId],
    queryFn: () => carregarPets({ data: { clienteId: ficha!.clienteId } }),
    enabled: Boolean(ficha && !ficha.petId),
  });

  const { data: histPet, isLoading: carregandoHist } = useQuery({
    queryKey: ["historico-pet-ficha", petAtual?.id],
    queryFn: () => carregarHistPet({ data: { petId: petAtual!.id } }),
    enabled: Boolean(petAtual),
  });

  // Reseta tudo sempre que abre uma ficha diferente.
  useEffect(() => {
    setPasso("carregando");
    setPetAtual(null);
    setPetIdEscolhido(null);
  }, [id]);

  // Decide o primeiro passo assim que ficha + pets do cliente carregarem.
  useEffect(() => {
    if (!ficha) return;
    if (ficha.petId) {
      setPasso("form");
      return;
    }
    if (passo !== "carregando" || carregandoPets) return;
    const pets = petsDoCliente ?? [];
    if (pets.length === 0) {
      setPasso("form");
    } else if (pets.length === 1) {
      setPetAtual(pets[0]!);
      setPasso("escolher-historico");
    } else {
      setPasso("selecionar-pet");
    }
  }, [ficha, petsDoCliente, carregandoPets, passo]);

  function carregarDadosNoForm(
    dados: {
      nome: string;
      tipo: string | null;
      sexo: string | null;
      nascimento: string | null;
      peso: number | null;
      cadastrado: boolean;
      temperamento: string | null;
      observacao: string | null;
      fotoUrl: string | null;
    },
    petId: string,
  ) {
    setPetNome(dados.nome);
    setPetTipo(dados.tipo);
    setSexo(dados.sexo);
    setNascimento(dados.nascimento ?? "");
    setPeso(dados.peso === null ? "" : String(dados.peso));
    setCadastrado(dados.cadastrado);
    setTemperamento(dados.temperamento);
    setObservacao(dados.observacao ?? "");
    setFotoPreview(dados.fotoUrl);
    setPetIdEscolhido(petId);
    setPasso("form");
  }

  function usarUltimoAtendimento() {
    if (!petAtual) return;
    const ultima = histPet?.visitas[0];
    if (ultima) {
      carregarDadosNoForm(
        {
          nome: petAtual.nome,
          tipo: ultima.petTipo,
          sexo: ultima.sexo,
          nascimento: ultima.nascimento,
          peso: ultima.peso,
          cadastrado: ultima.cadastrado,
          temperamento: ultima.temperamento,
          observacao: ultima.observacao,
          fotoUrl: ultima.fotoUrl,
        },
        petAtual.id,
      );
    } else {
      carregarDadosNoForm(petAtual, petAtual.id);
    }
  }

  function cadastrarOutroAnimal() {
    setPetIdEscolhido(null);
    setPasso("form");
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
    if (ficha.petId) setPetIdEscolhido(ficha.petId);
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

        {isLoading || (ficha && !ficha.petId && carregandoPets) || passo === "carregando" ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : passo === "selecionar-pet" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {ficha?.clienteNome} já tem {(petsDoCliente ?? []).length} pets cadastrados. Selecione
              um, ou cadastre um novo.
            </p>

            <div className="flex flex-col gap-2">
              {(petsDoCliente ?? []).map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => {
                    setPetAtual(pet);
                    setPasso("escolher-historico");
                  }}
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
                      {pet.tipo
                        ? (TIPO_PET_LABELS[pet.tipo] ?? "Tipo não informado")
                        : "Tipo não informado"}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              onClick={cadastrarOutroAnimal}
            >
              Cadastrar outro animal
            </Button>
          </div>
        ) : passo === "escolher-historico" && petAtual ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
              {petAtual.fotoUrl ? (
                <img
                  src={petAtual.fotoUrl}
                  alt={petAtual.nome}
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <PawPrint className="h-5 w-5" aria-hidden />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">{petAtual.nome || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">
                  {ficha?.clienteNome} já atendeu esse pet antes. O que você quer ver?
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="h-11 rounded-full"
                disabled={carregandoHist}
                onClick={usarUltimoAtendimento}
              >
                Último atendimento
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full"
                disabled={carregandoHist}
                onClick={() => setPasso("ver-historico")}
              >
                Histórico completo
              </Button>
            </div>

            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={cadastrarOutroAnimal}
            >
              Não é esse pet — cadastrar outro animal
            </button>
          </div>
        ) : passo === "ver-historico" && petAtual ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setPasso("escolher-historico")}
            >
              ← Voltar
            </button>

            {carregandoHist ? (
              <p className="text-sm text-muted-foreground">Carregando histórico...</p>
            ) : (histPet?.visitas ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ficha registrada ainda.</p>
            ) : (
              <Accordion type="multiple" className="flex flex-col gap-2">
                {(histPet?.visitas ?? []).map((v) => (
                  <AccordionItem
                    key={v.atendimentoId}
                    value={v.atendimentoId}
                    className="rounded-xl border border-border px-3"
                  >
                    <AccordionTrigger className="py-3 text-sm hover:no-underline">
                      <span className="flex flex-col items-start text-left">
                        <span className="font-medium">
                          {v.inicio
                            ? `${dataCurta(v.inicio)} · ${horaLocal(v.inicio)}`
                            : "Data não informada"}
                        </span>
                        <span className="text-xs text-muted-foreground">{v.servicoNome}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-3 pb-2">
                        {v.fotoUrl && (
                          <img
                            src={v.fotoUrl}
                            alt={`Foto da visita de ${dataCurta(v.inicio)}`}
                            className="h-24 w-24 rounded-xl object-cover ring-1 ring-border"
                          />
                        )}
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <Campo label="Peso" valor={v.peso === null ? "—" : `${v.peso} kg`} />
                          <Campo label="Cadastrado" valor={v.cadastrado ? "Sim" : "Não"} />
                          <Campo
                            label="Temperamento"
                            valor={
                              v.temperamento === "manso"
                                ? "Manso"
                                : v.temperamento === "bravo"
                                  ? "Bravo"
                                  : "—"
                            }
                          />
                          <Campo label="Cliente" valor={v.clienteNome} />
                        </dl>
                        {v.observacao && (
                          <div>
                            <dt className="text-xs text-muted-foreground">Observação</dt>
                            <dd className="text-sm">{v.observacao}</dd>
                          </div>
                        )}
                        <Button
                          type="button"
                          className="h-10 self-start rounded-full"
                          onClick={() =>
                            carregarDadosNoForm(
                              {
                                nome: petAtual.nome,
                                tipo: v.petTipo,
                                sexo: v.sexo,
                                nascimento: v.nascimento,
                                peso: v.peso,
                                cadastrado: v.cadastrado,
                                temperamento: v.temperamento,
                                observacao: v.observacao,
                                fotoUrl: v.fotoUrl,
                              },
                              petAtual.id,
                            )
                          }
                        >
                          Usar estes dados
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
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
          {passo === "form" && (
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
  const [petHistoricoId, setPetHistoricoId] = useState<string | null>(null);
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
                {i.petId ? (
                  <button
                    type="button"
                    className="text-sm font-bold underline-offset-2 hover:underline"
                    onClick={() => setPetHistoricoId(i.petId)}
                  >
                    {i.petNome}
                  </button>
                ) : (
                  <p className="text-sm font-bold">{i.petNome}</p>
                )}
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

      <PetHistoricoDialog petId={petHistoricoId} onClose={() => setPetHistoricoId(null)} />

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
  const carregar = useServerFn(listPetsComHistorico);
  const [petEscolhaId, setPetEscolhaId] = useState<string | null>(null);
  const [visualizacao, setVisualizacao] = useState<{
    petId: string;
    modo: "completo" | "ultimo";
  } | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["pets-historico"], queryFn: () => carregar() });

  const petEscolha = (data ?? []).find((p) => p.petId === petEscolhaId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && (data ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum pet com histórico ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(data ?? []).map((p) => (
            <li key={p.petId} className="rounded-2xl border border-border bg-card p-4">
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                onClick={() => setPetEscolhaId(p.petId)}
              >
                {p.fotoUrl ? (
                  <img
                    src={p.fotoUrl}
                    alt={p.nome}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <PawPrint className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold underline-offset-2 hover:underline">
                    {p.nome}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.tipo ? (TIPO_PET_LABELS[p.tipo] ?? "") : ""} · {p.totalVisitas}{" "}
                    {p.totalVisitas === 1 ? "atendimento" : "atendimentos"}
                    {p.ultimaVisitaEm ? ` · última em ${dataCurta(p.ultimaVisitaEm)}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(petEscolha)}
        onOpenChange={(open) => (!open ? setPetEscolhaId(null) : undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{petEscolha?.nome}</DialogTitle>
            <DialogDescription>O que você quer ver?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="h-11 rounded-full"
              onClick={() => {
                if (!petEscolha) return;
                setVisualizacao({ petId: petEscolha.petId, modo: "ultimo" });
                setPetEscolhaId(null);
              }}
            >
              Último atendimento
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => {
                if (!petEscolha) return;
                setVisualizacao({ petId: petEscolha.petId, modo: "completo" });
                setPetEscolhaId(null);
              }}
            >
              Histórico completo
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="h-12 rounded-full"
              onClick={() => setPetEscolhaId(null)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PetHistoricoDialog
        petId={visualizacao?.petId ?? null}
        modo={visualizacao?.modo ?? "completo"}
        onClose={() => setVisualizacao(null)}
      />
    </div>
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

// ---------------------------------------------------------------------------
// Histórico do pet (todas as fichas dele, numa visualização só)
// ---------------------------------------------------------------------------

function PetHistoricoDialog({
  petId,
  onClose,
  modo = "completo",
}: {
  petId: string | null;
  onClose: () => void;
  modo?: "completo" | "ultimo";
}) {
  const carregar = useServerFn(listHistoricoPet);
  const { data, isLoading } = useQuery({
    queryKey: ["historico-pet", petId],
    queryFn: () => carregar({ data: { petId: petId! } }),
    enabled: Boolean(petId),
  });

  const visitas = data ? (modo === "ultimo" ? data.visitas.slice(0, 1) : data.visitas) : [];

  return (
    <Dialog open={Boolean(petId)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{data ? data.pet.nome || "Pet sem nome" : "Histórico do pet"}</DialogTitle>
          <DialogDescription>
            {data
              ? modo === "ultimo"
                ? "Último atendimento"
                : `${data.visitas.length} ${data.visitas.length === 1 ? "ficha" : "fichas"} registradas`
              : "Carregando..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              {data.pet.fotoUrl ? (
                <img
                  src={data.pet.fotoUrl}
                  alt={data.pet.nome}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <PawPrint className="h-6 w-6" aria-hidden />
                </span>
              )}
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <Campo
                  label="Tipo"
                  valor={data.pet.tipo ? (TIPO_PET_LABELS[data.pet.tipo] ?? "—") : "—"}
                />
                <Campo
                  label="Sexo"
                  valor={
                    data.pet.sexo === "macho" ? "Macho" : data.pet.sexo === "femea" ? "Fêmea" : "—"
                  }
                />
                <Campo label="Nascimento" valor={data.pet.nascimento ?? "—"} />
                <Campo
                  label="Temperamento"
                  valor={
                    data.pet.temperamento === "manso"
                      ? "Manso"
                      : data.pet.temperamento === "bravo"
                        ? "Bravo"
                        : "—"
                  }
                />
              </dl>
            </div>

            {visitas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ficha registrada ainda.</p>
            ) : (
              <Accordion type="multiple" className="flex flex-col gap-2">
                {visitas.map((v) => (
                  <AccordionItem
                    key={v.atendimentoId}
                    value={v.atendimentoId}
                    className="rounded-xl border border-border px-3"
                  >
                    <AccordionTrigger className="py-3 text-sm hover:no-underline">
                      <span className="flex flex-col items-start text-left">
                        <span className="font-medium">
                          {v.inicio
                            ? `${dataCurta(v.inicio)} · ${horaLocal(v.inicio)}`
                            : "Data não informada"}
                        </span>
                        <span className="text-xs text-muted-foreground">{v.servicoNome}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-3 pb-2">
                        {v.fotoUrl && (
                          <img
                            src={v.fotoUrl}
                            alt={`Foto da visita de ${dataCurta(v.inicio)}`}
                            className="h-24 w-24 rounded-xl object-cover ring-1 ring-border"
                          />
                        )}
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <Campo label="Peso" valor={v.peso === null ? "—" : `${v.peso} kg`} />
                          <Campo label="Cadastrado" valor={v.cadastrado ? "Sim" : "Não"} />
                          <Campo
                            label="Temperamento"
                            valor={
                              v.temperamento === "manso"
                                ? "Manso"
                                : v.temperamento === "bravo"
                                  ? "Bravo"
                                  : "—"
                            }
                          />
                          <Campo label="Cliente" valor={v.clienteNome} />
                        </dl>
                        {v.observacao && (
                          <div>
                            <dt className="text-xs text-muted-foreground">Observação</dt>
                            <dd className="text-sm">{v.observacao}</dd>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, LogOut, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { supabase } from "@/integrations/supabase/client";
import {
  TIPO_AGENDA_LABELS,
  TIPO_AGENDA_VALUES,
  slugify,
  type TipoAgenda,
} from "@/lib/empresas-utils";
import {
  useCriarAdminEmpresa,
  useDefinirEmpresaAtiva,
  useExcluirEmpresa,
  useIsMaster,
  useMasterEmpresas,
  useSalvarEmpresa,
} from "@/lib/master-data";
import { useTemaVitrine } from "@/lib/tema-vitrine";

import type { MasterEmpresa } from "@/lib/master.functions";

export const Route = createFileRoute("/_authenticated/master/")({
  head: () => ({
    meta: [
      { title: "Empresas da plataforma" },
      { name: "description", content: "Gestão interna das empresas da plataforma." },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap",
      },
    ],
  }),
  component: MasterPage,
});

const DEFAULT_PRIMARY = "#b8451f";
const DEFAULT_SECONDARY = "#1f6f5c";
const DEFAULT_BACKGROUND = "#fdfaf6";
const DEFAULT_TEXT = "#2a231e";

/**
 * Aplica o tema visual do Vitrine (cores + tipografia) em toda a área do
 * master, inclusive nos diálogos/selects — que renderizam via portal fora
 * da árvore desta página, por isso a classe entra no <body> e não numa div
 * (ver src/lib/tema-vitrine.ts).
 */
function MasterPage() {
  useTemaVitrine();
  const navigate = useNavigate();
  const { data: isMaster, isLoading } = useIsMaster();
  const empresas = useMasterEmpresas();
  const definirAtiva = useDefinirEmpresaAtiva();

  const [empresaForm, setEmpresaForm] = useState<MasterEmpresa | "new" | null>(null);
  const [adminFor, setAdminFor] = useState<MasterEmpresa | null>(null);
  const [deleteFor, setDeleteFor] = useState<MasterEmpresa | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!isMaster) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <h1 className="text-2xl font-bold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">Esta conta não tem acesso a esta área.</p>
        <Button
          variant="outline"
          className="h-12 rounded-full px-6"
          onClick={async () => {
            await supabase.auth.signOut();
            void navigate({ to: "/master/login" });
          }}
        >
          Sair
        </Button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold">Empresas</h1>
              <p className="text-xs text-muted-foreground">Administração da plataforma</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="h-11 shrink-0 rounded-full"
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/master/login" });
            }}
          >
            <LogOut className="mr-1 h-4 w-4" aria-hidden />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {empresas.data?.length ?? 0} empresa(s) cadastrada(s)
          </p>
          <Button
            className="h-12 w-full rounded-full px-5 sm:w-auto"
            onClick={() => setEmpresaForm("new")}
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Nova empresa
          </Button>
        </div>

        {empresas.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando empresas...</p>
        ) : empresas.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar as empresas.</p>
        ) : (empresas.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold">Nenhuma empresa ainda</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cadastre a primeira empresa para liberar a agenda dela.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {(empresas.data ?? []).map((empresa) => (
              <li
                key={empresa.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  {empresa.logoUrl ? (
                    <img
                      src={empresa.logoUrl}
                      alt={`Logo ${empresa.nome}`}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <Building2 className="h-5 w-5" aria-hidden />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{empresa.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">/{empresa.slug}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-6 items-center rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary">
                        {TIPO_AGENDA_LABELS[empresa.tipoAgenda as TipoAgenda] ?? empresa.tipoAgenda}
                      </span>
                      <span
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ background: empresa.corPrimaria }}
                        title={`Cor primária ${empresa.corPrimaria}`}
                      />
                      <span
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ background: empresa.corSecundaria }}
                        title={`Cor secundária ${empresa.corSecundaria}`}
                      />
                      <span className="text-xs break-words text-muted-foreground">
                        {empresa.admins.length} admin(s)
                        {empresa.admins.length > 0
                          ? `: ${empresa.admins.map((admin) => admin.email).join(", ")}`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <Switch
                      checked={empresa.ativa}
                      onCheckedChange={(checked) =>
                        definirAtiva.mutate(
                          { id: empresa.id, ativa: checked },
                          {
                            onSuccess: () =>
                              toast.success(checked ? "Empresa ativada" : "Empresa desativada"),
                            onError: () => toast.error("Não foi possível alterar o status"),
                          },
                        )
                      }
                      aria-label={`Ativar ${empresa.nome}`}
                    />
                    {empresa.ativa ? "Ativa" : "Inativa"}
                  </label>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full"
                    onClick={() => setEmpresaForm(empresa)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full"
                    onClick={() => setAdminFor(empresa)}
                  >
                    <UserPlus className="mr-1 h-4 w-4" aria-hidden />
                    Admin
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full text-destructive hover:text-destructive"
                    onClick={() => setDeleteFor(empresa)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" aria-hidden />
                    Remover
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <EmpresaDialog empresa={empresaForm} onClose={() => setEmpresaForm(null)} />
      <AdminDialog empresa={adminFor} onClose={() => setAdminFor(null)} />
      <DeleteEmpresaDialog empresa={deleteFor} onClose={() => setDeleteFor(null)} />
    </div>
  );
}

function EmpresaDialog({
  empresa,
  onClose,
}: {
  empresa: MasterEmpresa | "new" | null;
  onClose: () => void;
}) {
  const editando = empresa && empresa !== "new" ? empresa : null;
  const salvar = useSalvarEmpresa();

  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [corPrimaria, setCorPrimaria] = useState(DEFAULT_PRIMARY);
  const [corSecundaria, setCorSecundaria] = useState(DEFAULT_SECONDARY);
  const [corFundo, setCorFundo] = useState("");
  const [corTexto, setCorTexto] = useState("");
  const [tipoAgenda, setTipoAgenda] = useState<TipoAgenda>("saude_bem_estar");
  const [ativa, setAtiva] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [key, setKey] = useState<string | null>(null);

  const currentKey = empresa === "new" ? "new" : (editando?.id ?? null);
  if (empresa && currentKey !== key) {
    setKey(currentKey);
    setNome(editando?.nome ?? "");
    setSlug(editando?.slug ?? "");
    setCorPrimaria(editando?.corPrimaria ?? DEFAULT_PRIMARY);
    setCorSecundaria(editando?.corSecundaria ?? DEFAULT_SECONDARY);
    setCorFundo(editando?.corFundo ?? "");
    setCorTexto(editando?.corTexto ?? "");
    setTipoAgenda((editando?.tipoAgenda as TipoAgenda) ?? "saude_bem_estar");
    setAtiva(editando?.ativa ?? true);
    setLogoFile(null);
  }

  return (
    <Dialog open={Boolean(empresa)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar empresa" : "Nova empresa"}</DialogTitle>
          <DialogDescription>
            A agenda pública fica em /agendar/{slug || "endereco-da-empresa"}.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            salvar.mutate(
              {
                ...(editando ? { id: editando.id } : {}),
                nome: nome.trim(),
                slug: slugify(slug || nome),
                corPrimaria,
                corSecundaria,
                corFundo,
                corTexto,
                tipoAgenda,
                ativa,
                logoFile,
              },
              {
                onSuccess: () => {
                  toast.success(editando ? "Empresa atualizada" : "Empresa criada");
                  onClose();
                },
                onError: (error) =>
                  toast.error(error instanceof Error ? error.message : "Falha ao salvar"),
              },
            );
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="empresa-nome">Nome da empresa</Label>
            <Input
              id="empresa-nome"
              required
              className="h-12"
              value={nome}
              onChange={(event) => {
                setNome(event.target.value);
                if (!editando) setSlug(slugify(event.target.value));
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="empresa-slug">Endereço da agenda</Label>
            <Input
              id="empresa-slug"
              required
              className="h-12"
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="empresa-tipo">Tipo de agenda</Label>
            <Select
              value={tipoAgenda}
              onValueChange={(value) => setTipoAgenda(value as TipoAgenda)}
            >
              <SelectTrigger id="empresa-tipo" className="h-12">
                <SelectValue placeholder="Selecione o segmento" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_AGENDA_VALUES.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {TIPO_AGENDA_LABELS[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Define o segmento do negócio — futuras regras da agenda vão depender disso.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="empresa-primaria">Cor primária</Label>
              <Input
                id="empresa-primaria"
                type="color"
                className="h-12 p-1"
                value={corPrimaria}
                onChange={(event) => setCorPrimaria(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="empresa-secundaria">Cor secundária</Label>
              <Input
                id="empresa-secundaria"
                type="color"
                className="h-12 p-1"
                value={corSecundaria}
                onChange={(event) => setCorSecundaria(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Personalizar cor de fundo</p>
                <p className="text-xs text-muted-foreground">
                  Sem isso, usa o fundo padrão do sistema.
                </p>
              </div>
              <Switch
                checked={corFundo !== ""}
                onCheckedChange={(checked) => setCorFundo(checked ? DEFAULT_BACKGROUND : "")}
              />
            </div>
            {corFundo !== "" && (
              <Input
                type="color"
                className="h-12 p-1"
                value={corFundo}
                onChange={(event) => setCorFundo(event.target.value)}
              />
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Personalizar cor de letra</p>
                <p className="text-xs text-muted-foreground">
                  Sem isso, usa a cor de texto padrão do sistema.
                </p>
              </div>
              <Switch
                checked={corTexto !== ""}
                onCheckedChange={(checked) => setCorTexto(checked ? DEFAULT_TEXT : "")}
              />
            </div>
            {corTexto !== "" && (
              <Input
                type="color"
                className="h-12 p-1"
                value={corTexto}
                onChange={(event) => setCorTexto(event.target.value)}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="empresa-logo">Logo (PNG ou JPG, até 2 MB)</Label>
            <Input
              id="empresa-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="h-12"
              onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
            />
            {editando?.logoUrl && !logoFile ? (
              <p className="text-xs text-muted-foreground">
                A logo atual é mantida se nenhum arquivo for escolhido.
              </p>
            ) : null}
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span className="text-sm font-medium">Empresa ativa</span>
            <Switch checked={ativa} onCheckedChange={setAtiva} />
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" className="h-12 rounded-full" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="h-12 rounded-full px-6" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminDialog({ empresa, onClose }: { empresa: MasterEmpresa | null; onClose: () => void }) {
  const criar = useCriarAdminEmpresa();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Dialog
      open={Boolean(empresa)}
      onOpenChange={(open) => {
        if (!open) {
          setFullName("");
          setEmail("");
          setPassword("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo administrador</DialogTitle>
          <DialogDescription>
            A conta terá acesso apenas aos dados de {empresa?.nome ?? "empresa"}.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!empresa) return;
            criar.mutate(
              {
                empresaId: empresa.id,
                fullName: fullName.trim(),
                email: email.trim(),
                password,
              },
              {
                onSuccess: () => {
                  toast.success("Administrador criado");
                  setFullName("");
                  setEmail("");
                  setPassword("");
                  onClose();
                },
                onError: (error) =>
                  toast.error(error instanceof Error ? error.message : "Falha ao criar a conta"),
              },
            );
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-name">Nome</Label>
            <Input
              id="admin-name"
              required
              className="h-12"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-email">E-mail</Label>
            <Input
              id="admin-email"
              type="email"
              required
              className="h-12"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-password">Senha provisória (mínimo 8 caracteres)</Label>
            <Input
              id="admin-password"
              type="text"
              required
              minLength={8}
              className="h-12"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" className="h-12 rounded-full" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="h-12 rounded-full px-6" disabled={criar.isPending}>
              {criar.isPending ? "Criando..." : "Criar acesso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteEmpresaDialog({
  empresa,
  onClose,
}: {
  empresa: MasterEmpresa | null;
  onClose: () => void;
}) {
  const remover = useExcluirEmpresa();
  const [confirm, setConfirm] = useState("");

  return (
    <Dialog
      open={Boolean(empresa)}
      onOpenChange={(open) => {
        if (!open) {
          setConfirm("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover empresa</DialogTitle>
          <DialogDescription>
            Esta ação apaga definitivamente serviços, clientes, agendamentos e as contas de
            administrador de {empresa?.nome ?? "empresa"}. Para apenas esconder a agenda, use a
            chave "Ativa".
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!empresa) return;
            remover.mutate(
              { id: empresa.id, confirmSlug: confirm.trim() },
              {
                onSuccess: () => {
                  toast.success("Empresa removida");
                  setConfirm("");
                  onClose();
                },
                onError: (error) =>
                  toast.error(error instanceof Error ? error.message : "Falha ao remover"),
              },
            );
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-confirm">
              Digite <span className="font-semibold">{empresa?.slug}</span> para confirmar
            </Label>
            <Input
              id="delete-confirm"
              required
              autoComplete="off"
              className="h-12"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" className="h-12 rounded-full" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="h-12 rounded-full px-6"
              disabled={remover.isPending || confirm.trim() !== empresa?.slug}
            >
              {remover.isPending ? "Removendo..." : "Remover definitivamente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

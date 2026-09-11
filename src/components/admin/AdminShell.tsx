import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  ExternalLink,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { brandingStyle } from "@/lib/branding";
import { useEmpresaAtual } from "@/lib/admin-data";

const LINKS = [
  { to: "/admin", label: "Dashboard", icon: BarChart3 },
  { to: "/admin/agendamentos", label: "Agendamentos", icon: CalendarCheck },
  { to: "/admin/cadastro", label: "Cadastro", icon: ClipboardList },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const { data: empresa, isLoading, isError } = useEmpresaAtual();

  async function sair() {
    await supabase.auth.signOut();
    void navigate({ to: "/admin/login" });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (isError || !empresa) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <h1 className="text-2xl font-bold">Conta sem empresa vinculada</h1>
        <p className="text-sm text-muted-foreground">
          Solicite ao responsável pela plataforma o vínculo da sua conta a uma empresa.
        </p>
        <Button variant="outline" className="h-12 rounded-full px-6" onClick={sair}>
          Sair
        </Button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={brandingStyle(empresa)}>
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:justify-between sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            {empresa.logo_url ? (
              <img
                src={empresa.logo_url}
                alt={`Logo ${empresa.nome}`}
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold sm:text-xl">{title}</h1>
              <p className="truncate text-xs text-muted-foreground">{empresa.nome}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full sm:hidden"
              aria-label="Ver agenda pública"
            >
              <Link to="/agendar/$slug" params={{ slug: empresa.slug }} target="_blank">
                <ExternalLink className="h-5 w-5" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="hidden h-11 rounded-full sm:inline-flex">
              <Link to="/agendar/$slug" params={{ slug: empresa.slug }} target="_blank">
                <ExternalLink className="mr-1 h-4 w-4" aria-hidden />
                Ver agenda pública
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full sm:hidden"
              aria-label="Sair"
              onClick={sair}
            >
              <LogOut className="h-5 w-5" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              className="hidden h-11 rounded-full sm:inline-flex"
              onClick={sair}
            >
              <LogOut className="mr-1 h-4 w-4" aria-hidden />
              Sair
            </Button>
          </div>
        </div>
        <div className="relative">
          <nav className="no-scrollbar mx-auto flex max-w-5xl snap-x gap-1 overflow-x-auto px-4 pb-3 sm:px-3">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: true }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                className="inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                <link.icon className="h-4 w-4" aria-hidden />
                {link.label}
              </Link>
            ))}
          </nav>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent sm:hidden"
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-6">{children}</main>
    </div>
  );
}

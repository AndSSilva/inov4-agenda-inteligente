import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dataExtenso } from "@/lib/tempo";

const ITENS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/agenda", label: "Minha Agenda" },
  { to: "/servicos", label: "Tipos de Agenda" },
  { to: "/crm", label: "Clientes" },
  { to: "/configuracoes", label: "Configurações" },
] as const;

export function PainelShell({
  empresaNome,
  children,
}: {
  empresaNome: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="board-bg min-h-screen bg-cream text-ink">
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-brand font-display text-sm font-semibold text-cream">
              C
            </span>
            <span className="text-sm font-semibold tracking-tight">Cronica</span>
            <span className="text-xs text-inksoft">Painel · {empresaNome}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-inksoft ring-1 ring-border">
              {dataExtenso(new Date())}
            </span>
            <button
              type="button"
              onClick={sair}
              className="rounded-full px-3 py-1 text-xs font-medium text-inksoft hover:text-ink"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl bg-paper ring-1 ring-border md:flex-row">
          <aside className="shrink-0 border-b border-border bg-cream/70 p-4 md:w-48 md:border-b-0 md:border-r">
            <nav className="grid gap-1 text-sm">
              {ITENS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-lg px-3 py-2 text-inksoft transition-colors hover:text-ink"
                  activeProps={{ className: "bg-brand/12 font-medium text-branddeep" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <div className="min-w-0 flex-1 p-4 sm:p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

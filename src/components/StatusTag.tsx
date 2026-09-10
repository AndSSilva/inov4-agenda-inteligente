import { ROTULO_STATUS } from "@/lib/tempo";
import { cn } from "@/lib/utils";

const CORES: Record<string, string> = {
  pendente: "bg-pend/15 text-pend",
  aguardando_confirmacao: "bg-gold/20 text-branddeep",
  confirmado: "bg-conf/15 text-conf",
  cancelado: "bg-canc/15 text-canc",
  concluido: "bg-conc/15 text-conc",
};

export function StatusTag({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
        CORES[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {ROTULO_STATUS[status] ?? status}
    </span>
  );
}

export function StatusDot({ status }: { status: string | null }) {
  const cor =
    status === "confirmado"
      ? "bg-conf"
      : status === "pendente"
        ? "bg-pend"
        : status === "cancelado"
          ? "bg-canc"
          : status === "concluido"
            ? "bg-conc"
            : "bg-border";
  return <span className={cn("size-2 shrink-0 rounded-full", cor)} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { bootstrapMaster } from "@/lib/bootstrap.functions";

export const Route = createFileRoute("/bootstrap-master")({
  ssr: false,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: BootstrapMasterPage,
});

function BootstrapMasterPage() {
  const executar = useServerFn(bootstrapMaster);
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">("carregando");
  const [resultado, setResultado] = useState<{ email: string; senha: string } | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const secret = new URLSearchParams(window.location.search).get("secret") ?? "";
    executar({ data: { secret } })
      .then((res) => {
        setResultado(res);
        setEstado("ok");
      })
      .catch((e) => {
        setErro(e instanceof Error ? e.message : "Falha desconhecida");
        setEstado("erro");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center font-mono text-sm shadow-sm">
        {estado === "carregando" && <p>Processando...</p>}
        {estado === "erro" && <p className="text-destructive">Erro: {erro}</p>}
        {estado === "ok" && resultado && (
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Acesso master pronto</p>
            <p>E-mail: {resultado.email}</p>
            <p>Senha: {resultado.senha}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Entre em /master/login. Depois, apague esta rota e o secret BOOTSTRAP_SECRET.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

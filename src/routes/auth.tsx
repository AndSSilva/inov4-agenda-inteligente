import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Cronica" },
      {
        name: "description",
        content: "Acesse o painel da sua empresa para gerenciar agenda, serviços e clientes.",
      },
      { property: "og:title", content: "Entrar · Cronica" },
      { property: "og:description", content: "Painel de agendamento e CRM da sua empresa." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(6, "A senha precisa de ao menos 6 caracteres").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, senha });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setCarregando(true);
    try {
      if (modo === "criar") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.senha,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Conta criada! Entrando…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.senha,
        });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/dashboard" });
      else toast.info("Confirme seu e-mail para entrar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="board-bg flex min-h-screen items-center justify-center bg-cream px-4 py-10 text-ink">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-paper shadow-board ring-1 ring-border">
        <div className="border-b border-border bg-gradient-to-b from-gold/25 to-transparent p-5">
          <Link to="/" className="text-xs font-medium tracking-[0.14em] text-branddeep uppercase">
            Cronica
          </Link>
          <h1 className="mt-1 text-2xl text-balance font-display">
            {modo === "entrar" ? "Entre no seu painel." : "Crie a conta do seu negócio."}
          </h1>
        </div>
        <form className="grid gap-3 p-5" onSubmit={enviar}>
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-inksoft">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="rounded-lg bg-cream/60 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-brand"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-inksoft">Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === "criar" ? "new-password" : "current-password"}
              required
              className="rounded-lg bg-cream/60 px-3 py-2 text-sm ring-1 ring-border outline-none focus:ring-brand"
            />
          </label>
          <button
            type="submit"
            disabled={carregando}
            className="mt-1 rounded-lg bg-brand py-2 text-sm font-medium text-cream shadow-slot ring-1 ring-brand disabled:opacity-60"
          >
            {carregando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
          </button>
          <button
            type="button"
            onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
            className="text-xs text-inksoft hover:text-ink"
          >
            {modo === "entrar" ? "Ainda não tem conta? Criar agora" : "Já tenho conta. Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

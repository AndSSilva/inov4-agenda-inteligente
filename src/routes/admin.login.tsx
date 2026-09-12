import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTemaVitrine } from "@/lib/tema-vitrine";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso do administrador — Cronica" },
      {
        name: "description",
        content: "Área restrita para gerenciar agenda, serviços e clientes.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Acesso do administrador" },
      { property: "og:description", content: "Área restrita do painel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  useTemaVitrine();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/admin" });
    });
  }, [navigate]);

  // O cadastro de empresa/admin é feito pelo Admin Master (/master) — não há
  // mais autocadastro público aqui, era a origem do bug "primeiro usuário
  // vira admin global".
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        const { data: isMaster } = await supabase.rpc("is_master", { _user_id: userId });
        if (isMaster) {
          void navigate({ to: "/master" });
          return;
        }
      }

      void navigate({ to: "/admin" });
    } catch {
      toast.error("E-mail ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold">Área do administrador</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entre com os dados enviados pelo administrador da plataforma.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="h-12"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              className="h-12"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button type="submit" className="h-12 rounded-full text-base" disabled={loading}>
            {loading ? "Aguarde..." : "Entrar"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Não tem acesso? Peça ao administrador da plataforma para criar sua conta.
          </p>
        </form>
      </div>
    </main>
  );
}

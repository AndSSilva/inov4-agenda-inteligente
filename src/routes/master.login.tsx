import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTemaVitrine } from "@/lib/tema-vitrine";

export const Route = createFileRoute("/master/login")({
  head: () => ({
    meta: [
      { title: "Acesso da plataforma" },
      { name: "description", content: "Área interna da plataforma." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Acesso da plataforma" },
      { property: "og:description", content: "Área interna da plataforma." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MasterLogin,
});

function MasterLogin() {
  useTemaVitrine();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error("Não foi possível validar esta conta.");

      const { data: isMaster } = await supabase.rpc("is_master", {
        _user_id: userId,
      });
      if (!isMaster) {
        await supabase.auth.signOut();
        throw new Error("Acesso restrito.");
      }

      void navigate({ to: "/master" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">Acesso da plataforma</h1>
        <p className="mt-1 text-sm text-muted-foreground">Área interna restrita.</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="master-email">E-mail</Label>
            <Input
              id="master-email"
              type="email"
              autoComplete="email"
              required
              className="h-12"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="master-password">Senha</Label>
            <Input
              id="master-password"
              type="password"
              autoComplete="current-password"
              required
              className="h-12"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button type="submit" className="h-12 rounded-full text-base" disabled={loading}>
            {loading ? "Aguarde..." : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}

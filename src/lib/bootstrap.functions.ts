import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EMAIL_MASTER = "ands10.97@gmail.com";

function gerarSenha(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/[+/=]/g, "").slice(0, 12);
}

/**
 * Uso único: cria (ou redefine a senha de) o usuário master, sem depender
 * de e-mail de convite. Protegida pelo secret BOOTSTRAP_SECRET (configure
 * em Cloud > Secrets antes de usar, e apague essa proteção/rota depois).
 */
export const bootstrapMaster = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ secret: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const esperado = process.env["BOOTSTRAP_SECRET"];
    if (!esperado || data.secret !== esperado) {
      throw new Error("Não autorizado.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const senha = gerarSenha();

    const { data: lista, error: erroLista } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (erroLista) throw new Error(erroLista.message);
    const existente = lista.users.find((u) => u.email === EMAIL_MASTER);

    let userId: string;
    if (existente) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(existente.id, {
        password: senha,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
      userId = existente.id;
    } else {
      const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
        email: EMAIL_MASTER,
        password: senha,
        email_confirm: true,
      });
      if (error || !criado.user) throw new Error(error?.message ?? "Falha ao criar usuário.");
      userId = criado.user.id;
    }

    const { error: erroRole } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "master" }, { onConflict: "user_id,role" });
    if (erroRole) throw new Error(erroRole.message);

    return { email: EMAIL_MASTER, senha };
  });

import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    const userId = data.user?.id;

    if (error || !userId) {
      throw redirect({ to: "/admin/login" });
    }

    const { data: isMaster } = await supabase.rpc("is_master", { _user_id: userId });
    throw redirect({ to: isMaster ? "/master" : "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Acesso — Cronica" },
      { name: "description", content: "Acesso aos painéis de gestão da Cronica." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Acesso — Cronica" },
      { property: "og:description", content: "Acesso aos painéis de gestão da Cronica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => null,
});

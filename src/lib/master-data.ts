import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  criarAdminEmpresa,
  definirEmpresaAtiva,
  excluirEmpresaMaster,
  listEmpresasMaster,
  salvarEmpresaMaster,
} from "./master.functions";
import type { TipoAgenda } from "./empresas-utils";

export function useIsMaster() {
  return useQuery({
    queryKey: ["is-master"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return false;
      const { data, error } = await supabase.rpc("is_master", { _user_id: userId });
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 30_000,
  });
}

export function useMasterEmpresas() {
  return useQuery({
    queryKey: ["master-empresas"],
    queryFn: () => listEmpresasMaster(),
  });
}

function useInvalidateEmpresas() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["master-empresas"] });
  };
}

export type EmpresaInput = {
  id?: string | undefined;
  nome: string;
  slug: string;
  corPrimaria: string;
  corSecundaria: string;
  corFundo: string;
  corTexto: string;
  tipoAgenda: TipoAgenda;
  ativa: boolean;
  logoFile?: File | null;
};

async function codificarLogo(file: File) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return {
    base64: btoa(binary),
    contentType: file.type || "image/png",
    extension: (file.name.split(".").pop() ?? "png").toLowerCase().slice(0, 5),
  };
}

export function useSalvarEmpresa() {
  const invalidate = useInvalidateEmpresas();
  return useMutation({
    mutationFn: async (input: EmpresaInput) => {
      if (input.logoFile && input.logoFile.size > 2_000_000) {
        throw new Error("A logo deve ter no máximo 2 MB.");
      }
      const logo = input.logoFile ? await codificarLogo(input.logoFile) : null;
      return salvarEmpresaMaster({
        data: {
          ...(input.id ? { id: input.id } : {}),
          nome: input.nome,
          slug: input.slug,
          corPrimaria: input.corPrimaria,
          corSecundaria: input.corSecundaria,
          corFundo: input.corFundo,
          corTexto: input.corTexto,
          tipoAgenda: input.tipoAgenda,
          ativa: input.ativa,
          logo,
        },
      });
    },
    onSuccess: invalidate,
  });
}

export function useDefinirEmpresaAtiva() {
  const invalidate = useInvalidateEmpresas();
  return useMutation({
    mutationFn: (input: { id: string; ativa: boolean }) => definirEmpresaAtiva({ data: input }),
    onSuccess: invalidate,
  });
}

export function useCriarAdminEmpresa() {
  const invalidate = useInvalidateEmpresas();
  return useMutation({
    mutationFn: (input: { empresaId: string; fullName: string; email: string; password: string }) =>
      criarAdminEmpresa({ data: input }),
    onSuccess: invalidate,
  });
}

export function useExcluirEmpresa() {
  const invalidate = useInvalidateEmpresas();
  return useMutation({
    mutationFn: (input: { id: string; confirmSlug: string }) =>
      excluirEmpresaMaster({ data: input }),
    onSuccess: invalidate,
  });
}

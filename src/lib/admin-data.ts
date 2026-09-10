import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getEmpresa } from "./painel.functions";

export function useEmpresaAtual() {
  const carregar = useServerFn(getEmpresa);
  return useQuery({
    queryKey: ["empresa-atual"],
    queryFn: () => carregar(),
    staleTime: 30_000,
    retry: false,
  });
}

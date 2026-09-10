import { useEffect } from "react";

/**
 * Aplica a paleta/tipografia do Inov4 Vitrine Digital (classe `.tema-vitrine`
 * definida em src/styles.css) enquanto a tela estiver montada. Fica no
 * <body> — e não numa div local — porque diálogos, selects e toasts
 * renderizam via portal fora da árvore da página.
 */
export function useTemaVitrine() {
  useEffect(() => {
    document.body.classList.add("tema-vitrine");
    return () => document.body.classList.remove("tema-vitrine");
  }, []);
}

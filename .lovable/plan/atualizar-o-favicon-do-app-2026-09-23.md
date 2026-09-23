# Atualizar o favicon do app

- Substituir o favicon atual pelo arquivo `favicon-agenda-terracota.ico` enviado, preservando seus tamanhos internos.
- Manter a referência existente ao favicon nas páginas do app.
- Conferir no navegador se o novo ícone é servido corretamente; se o navegador mostrar o antigo por cache, validar com uma recarga sem cache.

## Detalhes técnicos

O app já aponta para `/favicon.ico` no cabeçalho global. A mudança necessária é trocar somente esse arquivo em `public/`, sem alterar identidade visual ou outras funcionalidades.
# Consolidar as rotas do produto

## Objetivo
Manter somente estas áreas acessíveis:

- `/master`
- `/master/login`
- `/admin`
- `/admin/login`
- Todas as páginas atuais do painel sob `/admin/*`
- A página pública de cada empresa diretamente em `/<slug>`, por exemplo `/acai-pet`

## Alterações

- Remover páginas antigas ou duplicadas que estejam fora dessa estrutura.
- Trocar o endereço público atual `/agendar/<slug>` por `/<slug>`.
- Atualizar todos os botões, redirecionamentos e links internos para os novos endereços.
- Fazer a página inicial `/` direcionar para o acesso administrativo, sem manter uma página institucional separada.
- Garantir que o acesso protegido envie administradores para `/admin/login` e responsáveis da plataforma para `/master/login`.
- Preservar as páginas atuais do painel: visão geral, agendamentos, cadastro, clientes e configurações.
- Manter uma página de “não encontrado” para qualquer endereço fora da estrutura aceita.

## Validação

- Verificar acesso direto e atualização do navegador em todas as rotas mantidas.
- Confirmar que o link público curto carrega a empresa correta e conclui uma reserva.
- Confirmar que rotas removidas não aparecem mais e retornam “página não encontrada”.
- Validar login, saída e redirecionamentos dos dois níveis de acesso.
- Conferir o funcionamento em tela grande e celular, sem erros de carregamento.

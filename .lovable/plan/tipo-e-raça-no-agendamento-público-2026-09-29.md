# Tipo e raça no agendamento público

## O que será alterado
- Na etapa “Seus dados” de `/<empresa>`, adicionar a seleção obrigatória **Tipo do pet** com: Cachorro, Gato e Outro.
- Adicionar o campo descritivo **Raça**, opcional e limitado a 80 caracteres.
- Enviar os dois dados junto da reserva e preservá-los no cadastro do cliente.
- Ao iniciar o atendimento, preencher automaticamente a ficha com o tipo e a raça informados no agendamento.
- Exibir a raça na ficha de atendimento para que ela possa ser revisada pela equipe.

## Banco de dados e segurança
- Adicionar `pet_tipo` e `pet_raca` aos clientes.
- Atualizar a função pública de reserva com validação dos valores permitidos e limites de texto.
- Adicionar `pet_raca` a atendimentos e pets, mantendo as regras de acesso existentes.
- Atualizar os tipos gerados usados pelo aplicativo.

## Validação
- Confirmar que a página pública exige o tipo, aceita a raça e conclui a reserva.
- Confirmar que os dados chegam preenchidos na ficha de atendimento.
- Verificar a página em tela grande e celular e confirmar que o app continua sem erros.

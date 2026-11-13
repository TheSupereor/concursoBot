# Avaliação: Feature Telegram Bot

Use este checklist antes de marcar qualquer mudança nos comandos do bot como concluída.

## Critérios de aceite funcionais

- [ ] `/start` cadastra novo usuário e responde com boas-vindas
- [ ] `/start` em usuário já existente não cria duplicata
- [ ] `/areas` exibe teclado inline com as áreas disponíveis
- [ ] Clicar em área adiciona preferência e confirma via `answerCbQuery`
- [ ] Clicar em área com 5 preferências já cadastradas retorna erro informativo
- [ ] `/minhas_areas` lista áreas com botão de remover para cada uma
- [ ] Botão remover elimina a preferência correta
- [ ] `/salario` exibe opções de valor mínimo
- [ ] Selecionar salário sem preferências cadastradas retorna erro informativo
- [ ] `/assinar` retorna link de checkout funcional do Stripe

## Critérios arquiteturais

- [ ] `TelegramBotUpdate` não contém lógica de negócio (só delega para use cases)
- [ ] Handlers não acessam repositórios diretamente
- [ ] Cada comando mapeia para exatamente um use case

## Testes mínimos exigidos

- [ ] Unitário: `AddPreferenceUseCase` lança erro ao tentar adicionar 6ª preferência
- [ ] Unitário: `RemovePreferenceUseCase` remove a preferência correta
- [ ] Unitário: `DefineSalaryUseCase` lança erro sem preferências

## Verificação manual

- [ ] Cadastrar usuário com `/start`
- [ ] Adicionar 3 áreas distintas com `/areas`
- [ ] Tentar adicionar 6ª área — deve falhar com mensagem clara
- [ ] Remover uma área com `/minhas_areas`
- [ ] Definir salário mínimo com `/salario`
- [ ] Confirmar que área e salário estão salvos no banco (`preferences`)
- [ ] Executar `/assinar` e abrir o link — deve redirecionar ao Stripe Checkout

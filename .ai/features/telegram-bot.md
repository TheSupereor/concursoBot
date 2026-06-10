# Feature: Telegram Bot

## Objetivo

Interface principal do usuário. Todo fluxo de onboarding, configuração e assinatura
acontece via comandos e botões inline do Telegram.

## Comandos disponíveis

### /start
- Cadastra o usuário se ainda não existir (SignUpSubscriberUseCase)
- Cria Subscriber com `telegramId` da sessão, `isActive: true`
- Responde com mensagem de boas-vindas

### /areas
- Exibe teclado inline com áreas disponíveis
- Cada botão dispara callback `add_area_{area}` ao clicar

### Callback: add_area_{area}
- Adiciona preferência com área selecionada, region='BR', salário=0
- Respeita limite de 5 preferências (AddPreferenceUseCase lança erro se exceder)
- Responde com confirmação via `answerCbQuery`

### /minhas_areas
- Lista todas as preferências do usuário com botão "Remover" para cada uma
- Botão dispara callback `del_area_{area}`

### Callback: del_area_{area}
- Remove preferência pela área (RemovePreferenceUseCase)
- Responde com confirmação

### /assinar
- Cria sessão de Checkout do Stripe com `client_reference_id = telegramId`
- Retorna link da sessão para o usuário completar o pagamento

### /salario
- Exibe botões de valores de salário mínimo (ex: 1000, 2000, 3000, 5000)
- Botão dispara callback `set_salario_{valor}`

### Callback: set_salario_{valor}
- Define salário mínimo global para todas as preferências (DefineSalaryUseCase)
- Exige ao menos uma preferência cadastrada antes

## Restrições

- Máximo 5 preferências por assinante
- Salário mínimo só pode ser definido se houver ao menos 1 preferência
- Callbacks de área e salário devem responder com `answerCbQuery()` para fechar loading

## Arquivos relevantes

- `src/infrastructure/telegram/TelegramBotUpdate.ts` — handler de comandos
- `src/application/use-cases/` — use cases chamados por cada comando

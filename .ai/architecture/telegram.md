# Arquitetura Telegram

## Dois papéis distintos

O Telegram aparece em dois lugares com responsabilidades diferentes:

| Arquivo | Papel | Layer |
|---|---|---|
| `TelegramBotUpdate.ts` | Entry point — recebe comandos do usuário | Infrastructure (Interface) |
| `TelegramNotificationService.ts` | Adapter de saída — envia mensagens | Infrastructure (Adapter) |

## Comandos e callbacks (TelegramBotUpdate.ts)

| Trigger | Handler | Use Case |
|---|---|---|
| `/start` | @Start | SignUpSubscriberUseCase |
| `/areas` | @Command('areas') | Exibe teclado inline de áreas |
| `add_area_*` | @Action(/add_area_.+/) | AddPreferenceUseCase |
| `/minhas_areas` | @Command('minhas_areas') | Lista preferências com botão deletar |
| `del_area_*` | @Action(/del_area_.+/) | RemovePreferenceUseCase |
| `/assinar` | @Command('assinar') | Cria Stripe Checkout Session |
| `/salario` | @Command('salario') | Exibe botões de filtro de salário |
| `set_salario_*` | @Action(/set_salario_.+/) | DefineSalaryUseCase |

Callbacks usam `ctx.answerCbQuery()` para dar feedback visual ao usuário após a ação.

## Rate limiting (TelegramNotificationService.ts)

Telegram impõe limite de ~30 mensagens/segundo globalmente.

Implementação:
```typescript
new Bottleneck({ minTime: 35, maxConcurrent: 1 })
limiter.schedule(() => axios.post(...))
```

- `minTime: 35ms` — garante no máximo ~28 msgs/seg
- `maxConcurrent: 1` — processa sequencialmente, sem rajadas

Toda chamada à API do Telegram deve passar pelo limiter. Nunca chamar Axios diretamente.

## Formato de mensagens de vaga

```
📢 Nova vaga: {vacancy.job}
Área: {vacancy.area}
Região: {vacancy.region}
Salário: R$ {vacancy.salary.value}
```

## Variáveis de ambiente

```
TELEGRAM_BOT_TOKEN=...
```

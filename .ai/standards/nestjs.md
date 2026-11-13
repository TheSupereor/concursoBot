# Padrões NestJS

## Módulo principal

Toda configuração de DI fica em `app.module.ts`. Não criar módulos intermediários
desnecessários (o `NotificationsModule.ts` é legado, ignorar).

## Registro de providers

Ports são registradas com token string para respeitar inversão de dependência:

```typescript
{
  provide: 'ISubscriberRepository',
  useClass: MysqlSubscriberRepository,
}
```

Use Cases com múltiplas dependências usam factory:

```typescript
{
  provide: NotifySubscriberUseCase,
  useFactory: (repo, notif, log) => new NotifySubscriberUseCase(repo, notif, log),
  inject: ['ISubscriberRepository', 'INotificationService', 'INotificationLogRepository'],
}
```

## Controllers

- Responsabilidade: receber request, chamar use case, retornar response
- Sem lógica de negócio
- Sem acesso direto a repositórios
- Exemplo: `WebhookController.ts` — valida assinatura Stripe e delega para use case

## Entry points de bot/mensageria

- `TelegramBotUpdate.ts` — usa decorators do nestjs-telegraf (`@Start`, `@Command`, `@Action`)
- `VacancyConsumer.ts` — usa `@EventPattern('concursos.new')`
- Ambos delegam imediatamente para use cases

## Bootstrap (main.ts)

- `rawBody: true` obrigatório para validação de webhooks Stripe
- Dois transportes RabbitMQ conectados: fila principal e DLQ
- Porta HTTP configurada via `PORT` env

## Variáveis de ambiente

Acessar via `ConfigService` do `@nestjs/config` ou via `process.env` em providers que
não suportam injeção. Nunca hardcodar valores sensíveis.

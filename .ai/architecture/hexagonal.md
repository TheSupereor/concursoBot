# Arquitetura Hexagonal — Implementação Real

## Regra central
Dependências apontam sempre para dentro: Infrastructure → Application → Domain.
O domínio nunca importa nada de fora de `src/domain/`.

## Camadas e localizações

### Domain — `src/domain/`
Código puro, zero dependências de framework.

**Entities:**
- `Subscriber.ts` — Aggregate root. Contém regras de negócio (hasInterest, addPreference, activateSubscription).
- `Vacancy.ts` — Objeto de entrada imutável.

**Value Objects:**
- `Salary.ts` — Valida que o valor >= 0. Possui comparação `isBiggerThanOrEqual`.
- `Preference.ts` — Área + região + salário mínimo. Imutável.

**Ports (interfaces):**
- `ISubscriberRepository.ts` — save, searchByTelegramId, searchActiveSubscribers
- `INotificationService.ts` — sendVacancyAlert, sendCustomAlert
- `INotificationLogRepository.ts` — alreadySent, registerSent

**ORM Entities (exceção permitida):**
- `SubscriberOrmEntity.ts`, `PreferenceOrmEntity.ts`, `NotificationLogOrmEntity.ts`
- Ficam em `src/domain/entities/` mas são mapeamentos de persistência — não contêm regras de negócio.
- Entidades de domínio (`Subscriber.ts`) NUNCA importam as ORM entities.

### Application — `src/application/use-cases/`
Orquestra operações usando apenas as ports do domínio. Nunca importa TypeORM, Telegram, Stripe ou RabbitMQ diretamente.

| Use Case | Trigger | O que faz |
|---|---|---|
| SignUpSubscriberUseCase | /start | Cria assinante se não existir |
| AddPreferenceUseCase | callback add_area_* | Adiciona preferência (máx 5) |
| RemovePreferenceUseCase | callback del_area_* | Remove preferência por área |
| DefineSalaryUseCase | callback set_salario_* | Define salário mínimo global |
| NotifySubscriberUseCase | RabbitMQ message | Filtra assinantes e envia alertas |
| ProcessApprovedPaymentUseCase | webhook Stripe completed | Ativa assinatura |
| CancelSubscriptionUseCase | webhook Stripe deleted | Cancela assinatura |

### Infrastructure — `src/infrastructure/`
Adapters que implementam as ports do domínio.

| Port | Adapter | Tecnologia |
|---|---|---|
| ISubscriberRepository | MysqlSubscriberRepository | TypeORM + MySQL |
| INotificationLogRepository | MysqlNotificationLogRepository | TypeORM + MySQL |
| INotificationService | TelegramNotificationService | Axios + Bottleneck |

**Outros adapters:**
- `TelegramBotUpdate.ts` — Entry point (comandos do bot). Lê inputs do usuário, delega para use cases.
- `WebhookController.ts` — Entry point HTTP. Recebe webhooks do Stripe, delega para use cases.
- `VacancyConsumer.ts` — Entry point RabbitMQ. Consome fila `concursos.new`, executa NotifySubscriberUseCase.
- `pciConcursosScrapper.ts` — Cron job (30min). Scraper de vagas.

## Registro de DI (app.module.ts)

Ports são registradas com tokens string para respeitar inversão de dependência:

```typescript
{ provide: 'ISubscriberRepository', useClass: MysqlSubscriberRepository }
{ provide: 'INotificationService', useClass: TelegramNotificationService }
{ provide: 'INotificationLogRepository', useClass: MysqlNotificationLogRepository }
```

Use cases recebem as ports via `@Inject('ISubscriberRepository')` no construtor.

## Violações proibidas

- Subscriber.ts importar TypeORM → proibido
- Use case importar Stripe diretamente → proibido
- Controller conter lógica de negócio → proibido
- TelegramNotificationService acessar banco diretamente → proibido

# Architecture Decision Records

Short records of the decisions that shaped the project, with their context and trade-offs.
Format: context, decision, consequences. A decision is never edited away; a new record
supersedes it.

| #                                              | Decision                                                | Status                                                             |
| ---------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| [0001](0001-hexagonal-architecture.md)         | Hexagonal architecture with layers and feature modules  | Accepted                                                           |
| [0002](0002-telegram-id-as-primary-key.md)     | `telegramId` as the subscriber primary key              | Accepted                                                           |
| [0003](0003-schema-management.md)              | Schema sync in development, migrations before real data | Accepted, migrations pending                                       |
| [0004](0004-bottleneck-rate-limiting.md)       | Bottleneck for Telegram rate limiting                   | Accepted                                                           |
| [0005](0005-rabbitmq-retry-and-dlq.md)         | RabbitMQ with retries and a dead-letter queue           | Accepted                                                           |
| [0006](0006-claim-first-idempotency.md)        | Claim-first idempotency for notifications               | Accepted                                                           |
| [0007](0007-orm-entities-in-infrastructure.md) | ORM entities live in infrastructure                     | Accepted, supersedes the old "ORM entities in the domain" decision |
| [0008](0008-validated-typed-config.md)         | Environment validated once and injected as typed config | Accepted                                                           |
| [0009](0009-architecture-rules-in-ci.md)       | Architecture rules enforced in CI                       | Accepted                                                           |

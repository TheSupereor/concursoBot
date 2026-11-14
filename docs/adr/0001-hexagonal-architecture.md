# 0001. Hexagonal architecture with layers and feature modules

Status: Accepted

## Context

The system integrates several external services (Telegram, Stripe, RabbitMQ, MySQL, a scraped
website). Each can fail, change or be replaced, and the business rules (who should be alerted
about which vacancy, what a subscription allows) must stay testable without any of them.

## Decision

Use **ports and adapters**:

- `domain`: entities, value objects, domain errors and ports (interfaces). No imports from outside.
- `application`: use cases that orchestrate the domain through ports. No framework imports.
- `infrastructure`: adapters that implement the ports with NestJS, TypeORM, Telegraf, Stripe,
  amqplib.
- `modules`: NestJS modules that only wire adapters and use cases together.

Keep the **layered folder layout** and group providers into NestJS modules per context
(persistence, subscribers, billing, notifications, ...), instead of vertical slices with a
`domain/application/infrastructure` triple per context.

## Consequences

- Domain and use cases are tested with in-memory fakes, no database or network.
- Swapping an adapter (for example another notification channel) touches infrastructure only.
- A layered layout is simpler for a codebase of this size than vertical slices; if a context grows
  large enough to be extracted, its folders already map cleanly to a module.
- Use cases need explicit registration (`provideUseCase`) because they carry no decorators.
- The rules are enforced by tooling, see [0009](0009-architecture-rules-in-ci.md).

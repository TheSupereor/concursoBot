# Architecture Decision Records (ADRs)

Registros das decisões arquiteturais significativas do Radar de Concursos.

Cada ADR documenta: o contexto que gerou a decisão, o que foi decidido e
as consequências. O objetivo é que qualquer pessoa (ou agente) entenda
*por que* o sistema é como é, não apenas *o que* ele é.

## Status possíveis

- **Aceito** — decisão vigente, deve ser respeitada
- **Deprecado** — era válido, não é mais; há um substituto documentado
- **Revisão pendente** — decisão tomada provisoriamente, precisa ser reavaliada

## Índice

| # | Título | Status |
|---|---|---|
| [001](001-telegramid-como-pk.md) | telegramId como chave primária | Aceito |
| [002](002-synchronize-true-em-dev.md) | synchronize: true apenas em desenvolvimento | Aceito — revisão pendente para produção |
| [003](003-bottleneck-para-rate-limit.md) | Bottleneck para rate limiting do Telegram | Aceito |
| [004](004-rabbitmq-para-notificacoes.md) | RabbitMQ em vez de HTTP direto para notificações | Aceito |
| [005](005-orm-entities-no-dominio.md) | ORM entities dentro de src/domain/entities/ | Aceito — exceção documentada |

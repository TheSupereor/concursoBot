# Progresso do Projeto

Última atualização: 2026-06-09

## Implementado e funcional

- **Telegram Bot** — comandos /start, /areas, /minhas_areas, /salario, /assinar
- **Stripe Billing** — checkout session, webhooks de ativação e cancelamento
- **RabbitMQ** — fila `concursos.new` com retry exponencial e DLQ (`concursos.dlq`)
- **Notificações** — envio de vagas com rate limit (Bottleneck 35ms), idempotência via `notification_logs`
- **Filtro de salário** — definição de salário mínimo global por preferências
- **Domain** — entidades Subscriber, Vacancy, Value Objects Salary e Preference

## Resolvido recentemente

- `MysqlSubscriberRepository.save()` — implementado com cascade + orphanedRowAction: 'delete'
- `MysqlSubscriberRepository.searchByTelegramId()` — implementado
- `CancelSubscriptionUseCase` — notificação ao usuário adicionada via sendCustomAlert
- `pciConcursosScrapper.ts` — publica na fila via ClientProxy; deduplicação por hash em memória
- `VacancyConsumer` — campo names padronizados para inglês (job, region, salary)
- `SubscriberOrmEntity` — orphanedRowAction: 'delete' adicionado para remover preferências órfãs
- Seleção de região no bot — fluxo de dois passos: área → região → confirmação
- `NotifySubscriberUseCase.spec.ts` — atualizado com mock de INotificationLogRepository e teste de idempotência

## Incompleto / TODOs

- Desabilitar `synchronize: true` e criar migrations TypeORM para produção (ADR 002)
- `test/app.e2e-spec.ts` — erro de importação do supertest (pré-existente, não crítico)

## Próximos passos sugeridos

1. Desabilitar `synchronize: true` antes do primeiro deploy em produção
2. Comando `/status` — mostrar estado atual da assinatura e preferências
3. Múltiplas fontes de scraping
4. Health check endpoint (`GET /health`)
5. DLQ com alerta ativo para o administrador

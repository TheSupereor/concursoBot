# Progresso do Projeto

Última atualização: 2026-06-09

## Implementado e funcional

- **Telegram Bot** — comandos /start, /areas, /minhas_areas, /salario, /assinar
- **Stripe Billing** — checkout session, webhooks de ativação e cancelamento
- **RabbitMQ** — fila `concursos.new` com retry exponencial e DLQ (`concursos.dlq`)
- **Notificações** — envio de vagas com rate limit (Bottleneck 35ms), idempotência via `notification_logs`
- **Filtro de salário** — definição de salário mínimo global por preferências
- **Domain** — entidades Subscriber, Vacancy, Value Objects Salary e Preference

## Incompleto / TODOs identificados no código

- `MysqlSubscriberRepository.save()` — stub, não persiste dados
- `MysqlSubscriberRepository.searchByTelegramId()` — retorna null sempre
- `CancelSubscriptionUseCase` — notificação ao usuário pendente
- `pciConcursosScrapper.ts` — scraping implementado, mas publicação na fila não funciona (só loga)
- Scraper não implementa deduplicação por hash

## Em andamento

(atualizar conforme trabalho progride)

## Próximos passos sugeridos

1. Implementar `MysqlSubscriberRepository.save()` e `searchByTelegramId()`
2. Implementar publicação na fila dentro do scraper
3. Adicionar deduplicação de vagas no scraper (hash de título+cargo)
4. Adicionar notificação no cancelamento de assinatura
5. Desabilitar `synchronize: true` e criar migrations TypeORM para produção
6. Expandir cobertura de testes (atualmente: Subscriber.spec, Salary.spec, NotifySubscriberUseCase.spec)

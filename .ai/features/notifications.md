# Feature: Notificações de Vagas

## Objetivo

Enviar alertas de novas vagas de concurso para assinantes ativos que tenham
interesse na vaga, sem duplicatas e respeitando o rate limit do Telegram.

## Critérios de envio

Para cada vaga recebida via RabbitMQ, uma notificação é enviada ao assinante se:

1. `subscriber.isActive === true`
2. `subscriber.hasInterest(vacancy) === true` (match de área + região + salário)
3. `notificationLog.alreadySent(telegramId, vacancyId) === false`

Se qualquer condição falhar, a vaga é ignorada para aquele assinante.

## Fluxo completo

```
RabbitMQ (concursos.new)
  ↓ VacancyConsumer
  ↓ NotifySubscriberUseCase.execute(vacancy)
    ↓ para cada subscriber ativo
      ↓ hasInterest? → sim
      ↓ alreadySent? → não
      ↓ sendVacancyAlert(subscriber, vacancy)
      ↓ registerSent(telegramId, vacancyId)
  ↓ ack()
```

## Idempotência

- Tabela `notification_logs` com unique constraint `(telegramId, vacancyId)`
- `alreadySent()` consulta antes de enviar
- `registerSent()` insere após envio bem-sucedido
- Se o consumidor for reprocessado (retry), o envio duplicado é bloqueado pela checagem

## Rate limiting

Telegram limita ~30 msgs/segundo. `TelegramNotificationService` usa Bottleneck:
- `minTime: 35ms` entre chamadas
- `maxConcurrent: 1` — sem concorrência

Para grandes volumes, o Bottleneck enfileira automaticamente.

## Resiliência

- Falha ao enviar para 1 assinante não deve interromper os demais
- VacancyConsumer implementa retry com backoff exponencial (2s, 4s, 8s, max 3)
- Após 3 falhas: `nack(false)` → mensagem vai para `concursos.dlq`

## Arquivos relevantes

- `src/application/use-cases/NotifySubscriberUseCase.ts`
- `src/infrastructure/telegram/TelegramNotificationService.ts`
- `src/infrastructure/database/repositories/MysqlNotificationLogRepository.ts`
- `src/infrastructure/messaging/VacancyConsumer.ts`

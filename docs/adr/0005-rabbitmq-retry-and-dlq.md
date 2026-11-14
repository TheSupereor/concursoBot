# 0005. RabbitMQ with retries and a dead-letter queue

Status: Accepted. Retry queues with TTL are planned to replace the in-process delay.

## Context

Scraping and notification must be decoupled: a slow or failing Telegram call must not block the
scraper, a burst of vacancies must be absorbed, and a failure must never silently lose an alert.

## Decision

Publish vacancies to a durable RabbitMQ queue (`concursos.new`) and process them with manual
acknowledgement and `prefetch` 10.

- The queue is declared with a dead-letter exchange routing to `concursos.dlq`. The queue
  arguments are defined once (`vacancyQueueOptions`) and used by publisher and consumer, because
  RabbitMQ rejects a re-declaration with different arguments.
- The consumer validates the payload. A malformed message is dead-lettered immediately; a
  processing failure is retried up to 3 times with exponential backoff (2 s, 4 s), then
  dead-lettered.
- Delivery failures reach the consumer: the notification adapter returns a `DeliveryResult` and
  the use case throws a retryable error for transient failures.
- The DLQ is **declared but never consumed**, so messages stay ready for inspection and manual
  replay and the monitor can count them (`DlqMonitorService` alerts the admin chat).

## Consequences

- At-least-once delivery; duplicates are neutralised by [0006](0006-claim-first-idempotency.md).
- The backoff currently sleeps inside the handler, which occupies a prefetch slot. The target
  design is retry queues with TTL that dead-letter back to the main queue.
- Replaying the DLQ is a manual operation today.

# 0005. RabbitMQ with retries and a dead-letter queue

Status: Accepted

## Context

Scraping and notification must be decoupled: a slow or failing Telegram call must not block the
scraper, a burst of vacancies must be absorbed, and a failure must never silently lose an alert.

## Decision

Publish vacancies to a durable RabbitMQ queue (`concursos.new`) and process them with manual
acknowledgement and `prefetch` 10.

- The queue is declared with a dead-letter exchange routing to `concursos.dlq`. The queue
  arguments are defined once (`vacancyQueueOptions`) and used by publisher and consumer, because
  RabbitMQ rejects a re-declaration with different arguments.
- The consumer validates the payload. A malformed message is dead-lettered immediately.
- A processing failure is retried through **TTL retry queues**, never by sleeping in the handler.
  For each backoff delay there is a queue (`concursos.new.retry.2s`, `.4s`) with a message TTL
  that dead-letters back to the main queue. On failure the consumer publishes the message to the
  queue for its attempt (an `x-attempt` header carries the counter), then acknowledges the
  original. After the third failed attempt the message is dead-lettered to the DLQ.
- Delivery failures reach the consumer: the notification adapter returns a `DeliveryResult` and
  the use case throws a retryable error for transient failures.
- The DLQ is **declared but never consumed**, so messages stay ready for inspection and manual
  replay and the monitor can count them (`DlqMonitorService` alerts the admin chat).

## Consequences

- At-least-once delivery; duplicates are neutralised by [0006](0006-claim-first-idempotency.md).
- A retry never occupies a prefetch slot, so a failing downstream cannot stall the consumer.
- The retry copy is published before the original is acknowledged: a crash in between duplicates
  the message at worst, which idempotency absorbs, and never loses it.
- Replaying the DLQ is a manual operation today.

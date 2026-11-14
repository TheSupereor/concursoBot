# 0004. Bottleneck for Telegram rate limiting

Status: Accepted

## Context

The Telegram Bot API allows roughly 30 messages per second per bot (and about one per second per
chat). When a vacancy matches many subscribers, an uncontrolled burst gets HTTP 429 responses
and alerts are lost.

Options: manual `setTimeout` spacing, an internal queue with `setInterval`, or a dedicated
library.

## Decision

Use `bottleneck` with `{ minTime: 35, maxConcurrent: 1 }`. Every Bot API call goes through
`limiter.schedule()`.

## Consequences

- Concurrency-safe: parallel executions of the use case share one limiter, which manual sleeps
  cannot guarantee.
- Requests are queued and released one every 35 ms, about 28 per second, safely under the limit.
- The limiter is per process. Running several instances multiplies the effective rate, so a
  shared limiter (or a delivery queue with one consumer) is needed before scaling horizontally.
- A 429 that still happens is classified as retryable and honoured through the retry flow
  ([0005](0005-rabbitmq-retry-and-dlq.md)).

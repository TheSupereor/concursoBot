# 0006. Claim-first idempotency for notifications

Status: Accepted

## Context

A subscriber must never receive the same vacancy twice. The first design checked a log, sent the
message and then wrote the log. That has a race (two consumers can both pass the check) and a
crash window (a crash after sending but before logging duplicates the alert on redelivery).

## Decision

Reserve the right to notify **before** sending:

1. `claim(telegramId, vacancyId)` inserts a `PENDING` row; the unique index on
   `(telegramId, vacancyId)` makes the insert atomic.
2. After sending, mark the row `SENT`, or `FAILED` for permanent failures (blocked or invalid
   recipient). A transient failure `release`s the claim so a retry can take it.
3. A `PENDING` claim older than five minutes is considered abandoned and is taken over with an
   atomic conditional update.
4. If another worker holds a fresh claim, the message is retried rather than acknowledged, since
   that worker may still crash.

Stripe webhooks follow the same spirit: each event id is stored in `stripe_events`, events that
failed stay unfinished and are handled again on Stripe's retry, and the handlers are idempotent.

## Consequences

- Verified against a real MySQL: 20 concurrent claims produce exactly one winner.
- Delivery is at-least-once for the claim and effectively once for the user.
- A worker that dies holding a claim delays that alert by up to the lease (five minutes); a
  persistently stuck claim ends in the DLQ, where it is visible.

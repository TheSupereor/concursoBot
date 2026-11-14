# 0002. `telegramId` as the subscriber primary key

Status: Accepted

## Context

A primary key for `subscribers` had to be chosen: auto-increment id, UUID, or the external
Telegram user id. Every flow identifies a user by that id: bot commands (`ctx.from.id`), the
Stripe link (`client_reference_id` and subscription metadata), repository lookups and the
notification log.

## Decision

Use `telegramId` (string) as the primary key of `subscribers`.

## Consequences

- No extra unique column or internal id to map; lookups are primary-key lookups.
- Linking Stripe to a subscriber needs no translation table.
- The id is external: if Telegram ever changed how ids are issued, the key would break. A string
  key is slightly less efficient than an integer, which is acceptable at the expected volume.
- A subscriber can only be created once the id is known, which matches the flow (the user always
  starts the conversation).

Revisit only if related tables need index optimisation; then consider a UUID plus a unique index
on `telegramId`.

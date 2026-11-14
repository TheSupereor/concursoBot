# 0008. Environment validated once and injected as typed config

Status: Accepted

## Context

Configuration was read from `process.env` in many files, with silent defaults such as
`guest:guest` for RabbitMQ. A missing variable surfaced at runtime, far from the cause, and a
production deploy could run on development defaults.

## Decision

- Validate the whole environment once at startup with a zod schema and expose it as an
  immutable, typed `AppConfig` under the `APP_CONFIG` token.
- Fail fast, listing every problem by variable name and never printing values (they may be
  secrets).
- Only `shared/config` reads `process.env`; everything else receives `AppConfig` by injection.
- In `NODE_ENV=production`, security-relevant settings must be explicit and the default guest
  RabbitMQ credentials are refused.

## Consequences

- Misconfiguration stops the process at boot with a clear message instead of failing later.
- Tests build config objects directly; no global `process.env` mutation in specs.
- New settings require a schema entry, which doubles as documentation next to `.env.example`.

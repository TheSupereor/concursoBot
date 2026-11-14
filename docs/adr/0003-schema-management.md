# 0003. Schema sync in development, migrations before real data

Status: Accepted. The migration work is still pending (see the README progress board).

## Context

TypeORM's `synchronize: true` applies entity changes to the database on startup. It speeds up
early modelling, but in production it can drop columns, change column types and apply
unreviewed changes with no rollback.

## Decision

Keep `synchronize: true` only while the data is disposable. **Before the closed beta (milestone
M2) or any database with real data**, switch to explicit TypeORM migrations: generate an initial
migration from the current schema, run migrations on deploy and set `synchronize: false`.

## Consequences

- Fast iteration now; the risk is explicit and tracked rather than hidden.
- One known wart to fix in the initial migration: the column `minimunSalary` is misspelled. The ORM
  property was renamed to `minimumSalary` but keeps the historical column name so existing
  databases are untouched. Renaming the column must be an explicit migration, because
  `synchronize` adds columns but does not rename them.
- `notification_logs` gained `status` and `claimedAt`, and `stripe_events` was added
  ([0006](0006-claim-first-idempotency.md)); they will be part of the initial migration.

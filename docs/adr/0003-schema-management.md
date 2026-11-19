# 0003. The schema is owned by migrations

Status: Accepted. Supersedes the earlier decision to use `synchronize: true` during development.

## Context

TypeORM's `synchronize: true` applies entity changes to the database on startup. It speeds up
early modelling, but it can drop columns, change column types and apply unreviewed changes with no
rollback. The project used it while the data was disposable and recorded that it had to go before
the first real data.

## Decision

- `synchronize` is off. The schema is defined only by explicit, reviewed migrations in
  `src/infrastructure/persistence/migrations`, listed in `migrations/index.ts`.
- The application runs pending migrations at startup (`migrationsRun: true`), so `docker compose up`
  and the end-to-end smoke test build the schema from scratch.
- The TypeORM CLI uses a data source that needs only the `DB_*` variables:
  `npm run migration:generate -- <path>`, `migration:run`, `migration:revert` and
  `migration:check` (it fails when the entities and the migrated schema have drifted apart).
- The initial migration was generated from the entities against an empty database. Because there
  was no production data, the misspelled column `minimunSalary` was corrected to `minimumSalary`
  there instead of being renamed later.

## Consequences

- Schema changes are code-reviewed, reversible (`down`) and reproducible.
- A database created by the old `synchronize` setup must be recreated (for a local database:
  `docker compose down -v`), because the initial migration expects to create the tables.
- Running migrations at startup is convenient but not ideal with several instances starting at once.
  Before scaling out, run `migration:run` as a separate deployment step and turn `migrationsRun` off.
- Verified on a fresh MySQL: the migration runs, `migration:check` reports no drift, and
  `migration:revert` followed by `migration:run` restores the schema.

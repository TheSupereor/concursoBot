# Contributing

Thanks for your interest! This document describes how to work on the project.

## Requirements

- Node.js 22 (see `.nvmrc`) and npm
- Docker (MySQL and RabbitMQ run in containers)

## Setup

```bash
npm ci
cp .env.example .env        # fill in Telegram and Stripe test values
docker compose up -d mysql rabbitmq
npm run start:dev
```

The full stack, including the app, runs with `docker compose up --build`.

## Quality checks

Run these before opening a pull request. CI runs the same commands.

```bash
npm run format:check
npm run lint:check
npm run typecheck
npm run test:ci
npm run build
```

Unit tests enforce a coverage threshold per layer (see the Jest configuration in `package.json`);
`npm run coverage:summary` prints the numbers by layer after `npm run test:ci`. CI also runs the
integration tests, the end-to-end smoke test, a dependency audit and CodeQL, and keeps a release
pull request up to date (see [ADR 0014](docs/adr/0014-ci-quality-gates.md)).

Integration tests run against a real MySQL (`docker compose up -d mysql`) and create a throwaway
database per spec file, built by the real migrations:

```bash
npm run test:integration
```

The scraper depends on a third-party page layout. `npm run scraper:check` reads the live site
(five polite requests) and fails when the parser no longer understands it; CI runs it weekly:

```bash
npm run build && npm run scraper:check
```

The end-to-end smoke test runs the real app against MySQL and RabbitMQ with a fake Telegram API:

```bash
docker compose up -d mysql rabbitmq && npm run build && npm run smoke
```

Git hooks (husky) format and lint staged files on commit and validate the commit message.

## Database migrations

The schema is owned by migrations (`synchronize` is off). After changing an ORM entity, generate
a migration against an empty database, register it in
`src/infrastructure/persistence/migrations/index.ts` and check there is no drift:

```bash
npm run migration:generate -- src/infrastructure/persistence/migrations/<Name>
npm run migration:check
```

The app applies pending migrations at startup; `npm run migration:run` and
`npm run migration:revert` do it by hand.

## Commit and PR conventions

- **Conventional Commits**, in English: `feat(billing): ...`, `fix(notifications): ...`, `chore: ...`.
  Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Branch names: `feat/...`, `fix/...`, `chore/...`, `docs/...`.
- Pull requests are squash-merged, so the **PR title must also follow Conventional Commits**.
- Keep PRs small and focused (ideally under ~400 changed lines) and explain _why_, not only _what_.
- Add or update tests for every behavior change, and update the README / docs when behavior, setup or project status changes.

## Architecture rules

The project follows hexagonal architecture (ports and adapters). The domain layer must not import from NestJS, TypeORM, Telegraf, Stripe or RabbitMQ. See `docs/` for details and decision records.

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

Git hooks (husky) format and lint staged files on commit and validate the commit message.

## Commit and PR conventions

- **Conventional Commits**, in English: `feat(billing): ...`, `fix(notifications): ...`, `chore: ...`.
  Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Branch names: `feat/...`, `fix/...`, `chore/...`, `docs/...`.
- Pull requests are squash-merged, so the **PR title must also follow Conventional Commits**.
- Keep PRs small and focused (ideally under ~400 changed lines) and explain _why_, not only _what_.
- Add or update tests for every behavior change, and update the README / docs when behavior, setup or project status changes.

## Architecture rules

The project follows hexagonal architecture (ports and adapters). The domain layer must not import from NestJS, TypeORM, Telegraf, Stripe or RabbitMQ. See `docs/` for details and decision records.

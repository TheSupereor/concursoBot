# Radar de Concursos

[![CI](https://github.com/TheSupereor/alertas-concursos-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/TheSupereor/alertas-concursos-bot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-work_in_progress-orange)

A Telegram bot that watches Brazilian public-sector job postings ("concursos"), filters them by each
subscriber's preferences (area, region, minimum salary) and sends real-time alerts to paying subscribers.

> **Status: work in progress. Not ready for real users.** The project is being hardened in public,
> phase by phase. See the [progress board](#progress-board) for what works today and what does not.

## How it works

```
 Scraper (cron) ──▶ RabbitMQ ──▶ Consumer ──▶ Matching ──▶ Telegram alerts
                      │  (retry + DLQ)              ▲
 Stripe webhooks ─────┴──▶ Subscriptions ───────────┘
 Telegram commands ──────▶ Preferences / billing
```

- **Scraper** collects postings and publishes them to a queue.
- **Consumer** matches each posting against active subscribers and notifies them, idempotently.
- **Stripe** activates and cancels subscriptions through signed webhooks.
- **Bot commands:** `/start`, `/areas`, `/minhas_areas`, `/salario`, `/assinar`, `/status`.

## Tech stack

NestJS · TypeScript · MySQL (TypeORM) · RabbitMQ · Telegraf · Stripe · Docker · GitHub Actions

Architecture: hexagonal (ports and adapters) with a pure domain layer. Architecture notes and decision
records live in [`.ai/`](.ai) and will move to `docs/` as they are translated and consolidated.

## Progress board

Legend: ✅ done · 🚧 in progress · 📋 planned

| Phase                            | Status | Scope                                                                                   |
| -------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| 0. Baseline and repo hygiene     | ✅     | CI, license, commit conventions, Dockerfile, README                                     |
| 1. Critical fixes                | 🚧     | 4 of 9 fixes done. Billing, idempotency and messaging bugs, each with a regression test |
| 2. Architecture and code quality | 📋     | Pure domain, modules, validated config, strict TypeScript                               |
| 3. Messaging and data            | 📋     | Retry queues, migrations, matching in SQL                                               |
| 4. Vacancy sources               | 📋     | Source adapters, tested parsers, responsible scraping                                   |
| 5. Testing and CI                | 📋     | Integration tests with real MySQL and RabbitMQ containers                               |
| 6. Security, GDPR and operations | 📋     | Hardened image, health checks, metrics, data export/erasure                             |
| 7. Documentation                 | 📋     | Architecture docs, ADRs in English, demo                                                |
| 8. Product features              | 📋     | Pause mode, digest, i18n, billing portal                                                |

### Launch milestones

| Milestone                 | Status | Meaning                                            |
| ------------------------- | ------ | -------------------------------------------------- |
| M1: local stack in Docker | 🚧     | `docker compose up` runs the whole system          |
| M2: closed beta           | 📋     | Friends and testers, Stripe in test mode           |
| M3: paying customers      | 📋     | Hosted 24/7, Stripe live, privacy requirements met |

### What changed recently

- Phase 0 complete: Docker image and full-stack compose file, GitHub Actions pipeline, Conventional Commits, secret scanning.
- Phase 1 fixes so far: new users start inactive, notification log unique constraint, single RabbitMQ queue declaration, dead-letter queue without a consumer. Also fixed two startup blockers (Telegram dependency injection, missing amqplib).
- Declared the missing `amqplib` dependency (the app could not start on a clean install).

## Known limitations

These are known issues in the current code and are scheduled in the phases above:

- **End-to-end startup is not verified with real Telegram/Stripe credentials yet** (M1 blocker). The queue topology was verified against a real RabbitMQ broker.
- Stripe cancellation events may not reach the right user (metadata is set on the checkout session, not the subscription).
- Notification failures are swallowed, so retries and the dead-letter queue are not triggered for delivery errors.
- Schema is created with `synchronize: true`; there are no migrations.
- The scraper reads a single region and its area classifier produces false positives.
- Test coverage is limited to the domain and one use case.

## Getting started

Requirements: Node.js 22 (`.nvmrc`), Docker.

```bash
cp .env.example .env            # fill in Telegram and Stripe test values
docker compose up -d mysql rabbitmq
npm ci
npm run start:dev
```

`docker compose up --build` also builds and runs the app container (see the first limitation above).

Useful commands:

```bash
npm run test:ci       # unit tests with coverage
npm run lint:check
npm run typecheck
```

RabbitMQ management UI: <http://localhost:15672> (guest / guest, local only) · Adminer: <http://localhost:8080>

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Commits follow Conventional Commits. Security issues: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)

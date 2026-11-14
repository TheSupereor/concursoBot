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

| Phase                            | Status | Scope                                                                                                                                                        |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0. Baseline and repo hygiene     | ✅     | CI, license, commit conventions, Dockerfile, README                                                                                                          |
| 1. Critical fixes                | ✅     | 9 of 9 fixes done. Billing, idempotency and messaging bugs, each with a regression test                                                                      |
| 2. Architecture and code quality | 🚧     | 4 of 7 steps done: naming, persistence layer, domain model, validated config and feature modules. Next: strict TypeScript and lint, architecture rules, docs |
| 3. Messaging and data            | 📋     | Retry queues, migrations, matching in SQL                                                                                                                    |
| 4. Vacancy sources               | 📋     | Source adapters, tested parsers, responsible scraping                                                                                                        |
| 5. Testing and CI                | 📋     | Integration tests with real MySQL and RabbitMQ containers                                                                                                    |
| 6. Security, GDPR and operations | 📋     | Hardened image, health checks, metrics, data export/erasure                                                                                                  |
| 7. Documentation                 | 📋     | Architecture docs, ADRs in English, demo                                                                                                                     |
| 8. Product features              | 📋     | Pause mode, digest, i18n, billing portal                                                                                                                     |

### Launch milestones

| Milestone                 | Status | Meaning                                            |
| ------------------------- | ------ | -------------------------------------------------- |
| M1: local stack in Docker | 🚧     | `docker compose up` runs the whole system          |
| M2: closed beta           | 📋     | Friends and testers, Stripe in test mode           |
| M3: paying customers      | 📋     | Hosted 24/7, Stripe live, privacy requirements met |

### What changed recently

- Phase 0 complete: Docker image and full-stack compose file, GitHub Actions pipeline, Conventional Commits, secret scanning.
- Phase 1 complete: new users start inactive, atomic notification idempotency, delivery failures propagate to retries and the DLQ, a single RabbitMQ topology, idempotent Stripe webhooks with the Telegram id on the subscription, and escaped HTML alerts.
- Phase 2 so far: kebab-case file names; domain and application layers free of TypeORM and NestJS; typed domain errors and an immutable, validated `Preference`; environment validated once at startup (zod) and injected as typed config; one Stripe client and one Telegraf client; the app split into feature modules (`src/modules`).
- New `npm run smoke`: end-to-end test of the real app against real MySQL and RabbitMQ with a fake Telegram Bot API (`/start`, signed Stripe webhook, button callbacks, vacancy delivery, idempotency, dead-lettering).
- Declared the missing `amqplib` dependency (the app could not start on a clean install).

## Known limitations

These are known issues in the current code and are scheduled in the phases above:

- **Not yet run with real Telegram and Stripe credentials, nor inside the app container** (M1 blocker). The whole flow is verified end to end against real MySQL and RabbitMQ with a fake Telegram API (`npm run smoke`).
- Bot command replies still use legacy Markdown and Portuguese strings are inline (i18n comes later).
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
npm run smoke         # end-to-end test (needs `docker compose up -d mysql rabbitmq` and `npm run build`)
npm run test:ci       # unit tests with coverage
npm run lint:check
npm run typecheck
```

RabbitMQ management UI: <http://localhost:15672> (guest / guest, local only) · Adminer: <http://localhost:8080>

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Commits follow Conventional Commits. Security issues: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)

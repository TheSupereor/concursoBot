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

Architecture: hexagonal (ports and adapters) with a pure domain layer, enforced in CI. See [`docs/architecture.md`](docs/architecture.md) and the [decision records](docs/adr/README.md).

## Progress board

Legend: ✅ done · 🚧 in progress · 📋 planned

| Phase                            | Status | Scope                                                                                                                                      |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0. Baseline and repo hygiene     | ✅     | CI, license, commit conventions, Dockerfile, README                                                                                        |
| 1. Critical fixes                | ✅     | 9 of 9 fixes done. Billing, idempotency and messaging bugs, each with a regression test                                                    |
| 2. Architecture and code quality | ✅     | Naming, persistence layer, domain model, validated config and modules, strict TypeScript and lint, architecture rules in CI, docs and ADRs |
| 3. Messaging and data            | ✅     | Retry queues, migrations, matching in SQL, transactional saves. Vacancy persistence moves to phase 4 with the scraper                      |
| 4. Vacancy sources               | 🚧     | 1 of 3 steps done: parser and classifier. Next: ingestion pipeline and vacancy persistence, runtime and source policy                      |
| 5. Testing and CI                | 📋     | Integration tests with real MySQL and RabbitMQ containers                                                                                  |
| 6. Security, GDPR and operations | 📋     | Hardened image, health checks, metrics, data export/erasure                                                                                |
| 7. Documentation                 | 📋     | Architecture docs, ADRs in English, demo                                                                                                   |
| 8. Product features              | 📋     | Pause mode, digest, i18n, billing portal                                                                                                   |

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
- Phase 4 so far: the PCI Concursos listing parser was rewritten for the site's current markup (the old selectors matched nothing, which is why no vacancies were found), tested against a fixture and checked against the live page (all 346 listings of the Southeast page are understood). The area classifier matches whole words instead of substrings, and a vacancy now belongs to every area with evidence.
- Phase 3 complete. Saving a subscriber is transactional and keeps preference ids stable. Fixed along the way: removed preferences were silently left behind as orphan rows (the ORM option was on the wrong side of the relation); they are now deleted, and deleting a subscriber cascades.
- Phase 3: vacancies are matched to subscribers in SQL (`EXISTS` query plus two indexes) instead of loading every subscriber; an integration test against a real MySQL checks the query agrees with the domain rule over 45 combinations. New `npm run test:integration` (MySQL) also covers the claim-first idempotency and the Stripe event log with concurrency.
- Phase 3: the schema is now owned by TypeORM migrations (`synchronize` is off): an initial migration generated from the entities, `npm run migration:*` scripts and a drift check. A database created by the old setup must be recreated (`docker compose down -v`).
- Phase 3 so far: retries go through TTL queues (2s, 4s) instead of sleeping inside the handler, verified end to end against a real RabbitMQ (`npm run smoke` makes Telegram fail twice and checks the alert is delivered after the retries, with the DLQ untouched).
- Phase 2 complete. Architecture rules (`npm run arch:check`) now run in CI and fail the build if the domain or application layers import a framework or an outer layer; `docs/architecture.md` and nine ADRs in English document the design.
- TypeScript `strict` with `noUncheckedIndexedAccess`, ESLint `strict-type-checked` (no `any`, no `console`), and a logger port for the application layer. The vacancy consumer validates its payload and dead-letters malformed messages immediately; it now has tests.
- New `npm run smoke`: end-to-end test of the real app against real MySQL and RabbitMQ with a fake Telegram Bot API (`/start`, signed Stripe webhook, button callbacks, vacancy delivery, idempotency, dead-lettering).
- Declared the missing `amqplib` dependency (the app could not start on a clean install).

## Known limitations

These are known issues in the current code and are scheduled in the phases above:

- **Not yet run with real Telegram and Stripe credentials, nor inside the app container** (M1 blocker). The whole flow is verified end to end against real MySQL and RabbitMQ with a fake Telegram API (`npm run smoke`).
- Bot command replies still use legacy Markdown and Portuguese strings are inline (i18n comes later).
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
npm run arch:check    # layering rules (dependency-cruiser)
npm run test:integration # tests against a real MySQL (docker compose up -d mysql)
npm run migration:run # apply database migrations (the app also runs them at startup)
npm run typecheck
```

RabbitMQ management UI: <http://localhost:15672> (guest / guest, local only) · Adminer: <http://localhost:8080>

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Commits follow Conventional Commits. Security issues: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)

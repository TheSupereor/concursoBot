# Radar de Concursos

[![CI](https://github.com/TheSupereor/concursoBot/actions/workflows/ci.yml/badge.svg)](https://github.com/TheSupereor/concursoBot/actions/workflows/ci.yml)
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

| Phase                            | Status | Scope                                                                                                                                                                                     |
| -------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Baseline and repo hygiene     | ✅     | CI, license, commit conventions, Dockerfile, README                                                                                                                                       |
| 1. Critical fixes                | ✅     | 9 of 9 fixes done. Billing, idempotency and messaging bugs, each with a regression test                                                                                                   |
| 2. Architecture and code quality | ✅     | Naming, persistence layer, domain model, validated config and modules, strict TypeScript and lint, architecture rules in CI, docs and ADRs                                                |
| 3. Messaging and data            | ✅     | Retry queues, migrations, matching in SQL, transactional saves. Vacancy persistence moves to phase 4 with the scraper                                                                     |
| 4. Vacancy sources               | ✅     | PCI listing parser, ingestion pipeline with persisted vacancies, polite runtime (robots.txt, locking, weekly layout check). The source policy has one open question before charging users |
| 5. Testing and CI                | ✅     | Coverage thresholds per layer, bot handlers tested, smoke test and integration tests in CI, dependency audit, CodeQL, automated releases                                                  |
| 6. Security, GDPR and operations | 📋     | Hardened image, health checks, metrics, data export/erasure                                                                                                                               |
| 7. Documentation                 | 📋     | Architecture docs, ADRs in English, demo                                                                                                                                                  |
| 8. Product features              | 📋     | Pause mode, digest, i18n, billing portal                                                                                                                                                  |

### Launch milestones

| Milestone                 | Status | Meaning                                                                                                                               |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| M1: local stack in Docker | ✅     | `docker compose up --build` runs MySQL, RabbitMQ and the app; checked in containers with the real Telegram token and Stripe test keys |
| M2: closed beta           | 📋     | Friends and testers, Stripe in test mode                                                                                              |
| M3: paying customers      | 📋     | Hosted 24/7, Stripe live, privacy requirements met                                                                                    |

### What changed recently

- **New source: Cebraspe**, one of the largest exam organizers, read from the JSON API behind its website instead of HTML. Competitions just announced or open for registration become alerts, with roles, total openings, maximum salary and registration deadline, and a link to the organizer's page. Every response is validated, so a format change fails loudly instead of yielding nothing, and the weekly live check now covers both sources. This is the first step away from depending on a commercial aggregator (ADR 0015).
- Phase 0 complete: Docker image and full-stack compose file, GitHub Actions pipeline, Conventional Commits, secret scanning.
- Phase 1 complete: new users start inactive, atomic notification idempotency, delivery failures propagate to retries and the DLQ, a single RabbitMQ topology, idempotent Stripe webhooks with the Telegram id on the subscription, and escaped HTML alerts.
- Phase 2 so far: kebab-case file names; domain and application layers free of TypeORM and NestJS; typed domain errors and an immutable, validated `Preference`; environment validated once at startup (zod) and injected as typed config; one Stripe client and one Telegraf client; the app split into feature modules (`src/modules`).
- **Phase 5 complete.** CI now runs the end-to-end smoke test (real MySQL and RabbitMQ), unit tests with **coverage thresholds per layer** (domain 95%, application 90%, messaging 88%, scraper 90%, Telegram 95%) with the numbers in every run summary, the architecture rules, a dependency audit, CodeQL and weekly scraper checks, and release-please keeps a release pull request up to date. See ADR 0014. The Telegram bot handlers had never been tested in isolation (50% coverage); writing their tests found and fixed three bugs: `/start` told users to type a command that does not exist (`/filtros`), the salary confirmation used invalid bold markup and unformatted numbers, and `/status` hard-coded the limit of five areas.
- **Security audit.** `npm audit` found 19 vulnerabilities in production dependencies (1 critical). The non-breaking fixes brought it to 0 critical and 5 high. What remains needs a major upgrade of NestJS and TypeORM, so the pipeline fails on critical only for now (ADR 0014). `npm audit fix` also tried to downgrade `@nestjs/common` out of step with the rest of Nest; that was reverted.
- **Milestone M1 reached**: the whole system runs with `docker compose up --build`. Checked in containers with the real Telegram token and Stripe test keys: the app boots and the token is valid, migrations run on their own, the retry queues and dead-letter queue exist without consumers, the webhook refuses unsigned calls, the image reaches external sites and a restart keeps the data. The Telegram and Stripe round trips (a real `/start`, a test payment, an alert) were verified earlier with the same code running outside the container. Two things had to be fixed on the way: the compose app service lacked the database credentials, and it must run in development mode because the image defaults to production, which refuses the guest RabbitMQ credentials.
- Phase 4 complete. The scraper behaves like a good guest by construction: honest User-Agent, `robots.txt` obeyed (RFC 9309 semantics), paced requests, one lock shared by all instances, listing metadata only with a link back to the source, and **no source enabled by default in production**. A weekly workflow (`npm run scraper:check`) reads the live site and fails if the parser stops understanding it; today it parses 602 vacancies. See ADR 0013, including the open question about reusing the site's data in a paid product.
- Phase 4: vacancies are now ingested by a use case behind an `IVacancySource` port: each gets a stable id (SHA-256 of source and address), is deduplicated in a `vacancies` table (so a restart no longer re-announces everything), is published to the queue, and alerts carry the organization, areas, salary ceiling, deadline and a link to the listing. Cancelled and expired competitions are skipped. The old scraper is gone.
- Phase 4 so far: the PCI Concursos listing parser was rewritten for the site's current markup (the old selectors matched nothing, which is why no vacancies were found), tested against a fixture and checked against the live page (all 346 listings of the Southeast page are understood). The area classifier matches whole words instead of substrings, and a vacancy now belongs to every area with evidence.
- Phase 3 complete. Saving a subscriber is transactional and keeps preference ids stable. Fixed along the way: removed preferences were silently left behind as orphan rows (the ORM option was on the wrong side of the relation); they are now deleted, and deleting a subscriber cascades.
- Phase 3: vacancies are matched to subscribers in SQL (`EXISTS` query plus two indexes) instead of loading every subscriber; an integration test against a real MySQL checks the query agrees with the domain rule over 45 combinations. New `npm run test:integration` (MySQL) also covers the claim-first idempotency and the Stripe event log with concurrency.
- Phase 3: the schema is now owned by TypeORM migrations (`synchronize` is off): an initial migration generated from the entities, `npm run migration:*` scripts and a drift check. A database created by the old setup must be recreated (`docker compose down -v`).
- Phase 3 so far: retries go through TTL queues (2s, 4s) instead of sleeping inside the handler, verified end to end against a real RabbitMQ (`npm run smoke` makes Telegram fail twice and checks the alert is delivered after the retries, with the DLQ untouched).
- Phase 2 complete. Architecture rules (`npm run arch:check`) now run in CI and fail the build if the domain or application layers import a framework or an outer layer; `docs/architecture.md` and nine ADRs in English document the design.
- TypeScript `strict` with `noUncheckedIndexedAccess`, ESLint `strict-type-checked` (no `any`, no `console`), and a logger port for the application layer. The vacancy consumer validates its payload and dead-letters malformed messages immediately; it now has tests.
- New `npm run smoke`: end-to-end test of the real app against real MySQL and RabbitMQ with a fake Telegram Bot API (`/start`, signed Stripe webhook, button callbacks, vacancy delivery, idempotency, dead-lettering).
- Declared the missing `amqplib` dependency (the app could not start on a clean install).

## Data sources and fair use

Vacancies come from public listings on third-party sites. The scraper identifies itself, obeys `robots.txt`, limits its request rate and reads only listing metadata, and every alert links back to the source. Nothing is scraped in production unless an operator enables it with `SCRAPER_ENABLED_SOURCES`.

**Before charging users, get the source's permission or switch to sources that allow reuse** (see [ADR 0013](docs/adr/0013-vacancy-source-policy.md)).

## Known limitations

- **Dependencies with known high vulnerabilities:** NestJS core, microservices and platform-express (and their body-parser and multer dependencies) and TypeORM, fixable only by a major upgrade. Tracked, and the CI audit moves to the `high` level when it lands.

These are known issues in the current code and are scheduled in the phases above:

- Bot command replies still use legacy Markdown and Portuguese strings are inline (i18n comes later).
- Listings titled "Vários Cargos" (about 40% of a regional page) carry no role information, so they only reach subscribers who follow any area.
- The PCI Concursos data is fine for development and a closed beta, but reusing it in a paid product needs the site's permission (ADR 0013).
- Test coverage is limited to the domain and one use case.

## Getting started

Requirements: Docker, and Node.js 22 (`.nvmrc`) only if you run the app outside Docker.

### Everything in Docker

```bash
cp .env.example .env     # fill in TELEGRAM_BOT_TOKEN and the Stripe test values
docker compose up --build
```

This starts MySQL, RabbitMQ, Adminer and the app; the database schema is created by the migrations at startup. The `DB_*` variables are set by the compose file, so `.env` only needs the Telegram and Stripe values.

To receive Stripe webhooks locally, forward them with the Stripe CLI and use the signing secret it prints as `STRIPE_WEBHOOK_SECRET`:

```bash
stripe listen --events checkout.session.completed,customer.subscription.deleted --forward-to localhost:3000/webhooks/stripe
```

### App on your machine, dependencies in Docker

```bash
cp .env.example .env     # also fill in the DB_* values
docker compose up -d mysql rabbitmq
npm ci
npm run start:dev
```

This local stack runs the app in development mode. The image itself defaults to production, which refuses the default RabbitMQ credentials and requires explicit Stripe redirect URLs.

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

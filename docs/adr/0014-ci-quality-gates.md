# 0014. CI quality gates

Status: Accepted. One gate (the audit level) is deliberately below its target, see below.

## Context

A claim in the README ("tested", "secure", "layered") is only as good as what stops a change from
breaking it. The pipeline must fail for the things this project says it guarantees, and it must be
the same checks a developer runs locally.

## Decision

Every pull request and every push to `main` runs these jobs, and each exists because of a failure
that happened or a guarantee the project makes:

| Job                                           | What it guards                                                                                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint, typecheck, test, build                  | Prettier, strict ESLint, strict TypeScript, **architecture rules**, unit tests with **coverage thresholds per layer**, the production build, and the dependency audit         |
| Integration tests (MySQL)                     | Repositories against a real database built by the migrations: SQL matching versus the domain rule, concurrent idempotency claims, the job lock                                |
| End-to-end smoke test                         | The real application against real MySQL and RabbitMQ, with fake Telegram and fake PCI Concursos: the whole flow, retries through the TTL queues, dead-lettering, `robots.txt` |
| Docker image builds                           | The image still builds                                                                                                                                                        |
| Conventional PR title, README or docs updated | History and documentation stay honest                                                                                                                                         |
| Secret scan, CodeQL (also weekly)             | No secrets in history; static security analysis                                                                                                                               |

Two more workflows run on their own: a **weekly scraper check** against the live site (the page is
not an API and its layout changes without notice) and **release-please**, which keeps a release pull
request up to date from the Conventional Commits.

Details that matter:

- **Coverage thresholds are per layer**, set from measured values (domain 95%, application 90%,
  messaging 88%, scraper 90%, Telegram 95%, DLQ monitor 90%). There is no global threshold: the
  persistence layer is exercised by the integration tests, so a unit-only global figure would be
  misleading. A threshold that cannot be met fails the run; this was verified with an impossible one.
  Each run prints the numbers by layer in its summary.
- **Dependency audit policy.** The job fails on a **critical** vulnerability in production
  dependencies. High ones do not fail it yet, because the remaining ones (NestJS core,
  microservices and platform-express with their body-parser and multer dependencies, and TypeORM)
  can only be fixed by a major upgrade of those frameworks, which is a planned piece of work of its
  own. The level moves to `high` when that upgrade lands.
- **Dependabot** groups minor and patch updates and opens a major update as its own pull request, so
  a breaking one cannot block the safe updates next to it.
- The workflows were validated with `actionlint`, since they cannot be run locally.

## Consequences

- The architecture, the coverage of each layer and the behaviour of the whole system are enforced
  by the pipeline, not by convention.
- The pipeline takes a few minutes; the smoke test is the slowest part, because it waits for real
  retries and several scraper runs.
- Until the framework upgrade, known high vulnerabilities remain in production dependencies. They
  are listed in the README and in the audit output rather than hidden.

# Changelog

## [0.1.0](https://github.com/TheSupereor/concursoBot/compare/v0.0.1...v0.1.0) (2026-11-20)


### Features

* **messaging:** retry through TTL queues instead of sleeping in the handler ([23eff13](https://github.com/TheSupereor/concursoBot/commit/23eff133e3165521552a38efc55f77cbcc77d431))
* **persistence:** match subscribers in SQL and add integration tests ([44fe6f1](https://github.com/TheSupereor/concursoBot/commit/44fe6f1cee2608760e6cbf49a38eb5a5146bc3f3))
* **persistence:** own the schema with TypeORM migrations ([9d9ceea](https://github.com/TheSupereor/concursoBot/commit/9d9ceea07181735b97427a93031416fea9b05a74))
* **persistence:** save the subscriber transactionally with stable preference ids ([70fb95e](https://github.com/TheSupereor/concursoBot/commit/70fb95ea3a3d7c48657f7de05c80ae526bbfada8))
* **scraper:** obey robots.txt, lock between instances and watch the live layout ([bc573ea](https://github.com/TheSupereor/concursoBot/commit/bc573ea6d57ee47eff2a2581bf4514b168f24597))
* **scraper:** parse the current PCI Concursos markup and classify areas properly ([10f5a04](https://github.com/TheSupereor/concursoBot/commit/10f5a04f941459e49a718f1cbaa357b96c797a51))
* **vacancies:** ingest sources with stable ids, persisted dedupe and several areas ([a655d19](https://github.com/TheSupereor/concursoBot/commit/a655d1926a658bfea0dfd099945517f50722049f))


### Bug fixes

* **billing:** idempotent Stripe webhook and subscription metadata ([d00926a](https://github.com/TheSupereor/concursoBot/commit/d00926ad3e157a25fc7d5e5d21a929e5a5ac6c50))
* **deps:** apply the non-breaking security fixes from npm audit ([ac18363](https://github.com/TheSupereor/concursoBot/commit/ac18363868db8ac362ca88895b8a99e028112b83))
* **deps:** declare amqplib and amqp-connection-manager ([e9839bd](https://github.com/TheSupereor/concursoBot/commit/e9839bd14e9e24c03e05340dae33f6421e20ba44))
* **docker:** make the compose stack boot, closing milestone M1 ([9d7ef1f](https://github.com/TheSupereor/concursoBot/commit/9d7ef1fb36f958d73e1baf9b1f31493e33b26ea3))
* **messaging:** let Nest build VacancyConsumer and isolate the smoke test ([304d599](https://github.com/TheSupereor/concursoBot/commit/304d599aa3619488b9a8c3c9dfa18a5213276903))
* **messaging:** single queue topology and DLQ without consumer ([ed09429](https://github.com/TheSupereor/concursoBot/commit/ed094291275e090e0c0cabf06d4a312058675f68))
* **notifications:** make idempotency atomic with claim-first ([71eaeca](https://github.com/TheSupereor/concursoBot/commit/71eaecac3c670a5589595cdc81e1305df0e8581c))
* **notifications:** point unique constraint at vacancyId ([854161e](https://github.com/TheSupereor/concursoBot/commit/854161e702f9042eba3c4b40a466399ef79625bf))
* **notifications:** propagate delivery failures ([c0977f0](https://github.com/TheSupereor/concursoBot/commit/c0977f0a569f543372dcdd63f559bc6d67fbbb0c))
* **subscribers:** register new users as inactive ([cc14141](https://github.com/TheSupereor/concursoBot/commit/cc141412b050a52638bcacb005b2ceaf5278c30e))
* **telegram:** inject subscriber repository by token ([9d9344e](https://github.com/TheSupereor/concursoBot/commit/9d9344eb69232d1402ef77a454e9a448a15cb43e))
* **telegram:** send vacancy alerts as escaped HTML ([aed1a57](https://github.com/TheSupereor/concursoBot/commit/aed1a57cc4bb13628d95b70aeb40f8e040795ac1))


### Refactoring

* enrich the domain model with typed errors and validated value objects ([392b300](https://github.com/TheSupereor/concursoBot/commit/392b3009843adf685100e7645aae1e762d9b6bbc))
* move ORM entities to infrastructure/persistence and add mapper ([e98bdd7](https://github.com/TheSupereor/concursoBot/commit/e98bdd7e111cced1ece0d9c31c242ddc6defc0c0))
* strict TypeScript, strict ESLint and a logger port ([2e2f7a4](https://github.com/TheSupereor/concursoBot/commit/2e2f7a450e520827afbdf0e858378bbd19c919c9))
* use kebab-case file names and fix naming typos ([c20f6fb](https://github.com/TheSupereor/concursoBot/commit/c20f6fb5567cd15b8db0de4a66cc4a42ca564d30))
* validated config, single clients and feature modules ([c98f3a4](https://github.com/TheSupereor/concursoBot/commit/c98f3a46af552a6c547d6f2a8706b70b4dbb28e7))


### Tests

* **bot:** cover every command and button, and fix three message bugs ([7e14802](https://github.com/TheSupereor/concursoBot/commit/7e14802bea28d0c6058d50d574262191f37497dc))
* enforce coverage by layer and cover the DLQ monitor ([a040a92](https://github.com/TheSupereor/concursoBot/commit/a040a92df5a20e5dec9bebb1dd1471c02106fbf6))
* fix supertest import so typecheck passes ([cd6bbe9](https://github.com/TheSupereor/concursoBot/commit/cd6bbe986b692130b2b8aa3b7c2d088b0295d88b))


### Documentation

* add architecture overview and ADRs in English ([0aeffc2](https://github.com/TheSupereor/concursoBot/commit/0aeffc23680aa152105072ac1c3c41dcc30af401))
* record the CI quality gates and close phase 5 ([cf901dc](https://github.com/TheSupereor/concursoBot/commit/cf901dc7d30433330a38408ff76617214c0f3637))
* replace boilerplate README with project overview and progress board ([1310433](https://github.com/TheSupereor/concursoBot/commit/1310433ea66b9b769187d2418afa683669c7a41f))
* update progress board for phase 1 progress ([645d40b](https://github.com/TheSupereor/concursoBot/commit/645d40bb70a8405c104b31a6049fe49dc07a7d00))


### Build and Docker

* add minimal Dockerfile and full-stack compose ([1fdcac4](https://github.com/TheSupereor/concursoBot/commit/1fdcac4e3321d72e13c044de960b61165ca1f5c5))


### CI

* add GitHub Actions pipeline and dependabot ([7fa7d9e](https://github.com/TheSupereor/concursoBot/commit/7fa7d9ea8e704acb1ef95e70e2989d0324298249))
* add gitleaks secret scanning ([629505d](https://github.com/TheSupereor/concursoBot/commit/629505dce83db879221394c4122274187b7c7a73))
* add quality gates, per-layer coverage and bot handler tests (phase 5) ([595efc1](https://github.com/TheSupereor/concursoBot/commit/595efc19cd52539d79fa715beb54da387f298861))
* automate releases with release-please ([ef44b70](https://github.com/TheSupereor/concursoBot/commit/ef44b70892541a52cbf4cdd43373d21962ffd50d))
* require docs update when source changes ([ac6830d](https://github.com/TheSupereor/concursoBot/commit/ac6830dad398305d973a2cf9db19a89ae95b557e))
* run the smoke test, audit dependencies, summarize coverage and add CodeQL ([60f29d8](https://github.com/TheSupereor/concursoBot/commit/60f29d87d72477ffac34d7b387f0fb382ad4047b))

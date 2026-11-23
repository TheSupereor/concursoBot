# 0015. Official sources for vacancies

Status: Accepted. The Cebraspe source is implemented; the other steps are pending, and some facts
below are still unverified.

## Context

The only source today is the listing pages of a commercial site (ADR 0013). Two problems follow:

- **Maintenance.** The parser reads HTML. The layout changes without notice, and that is how the
  old parser ended up finding zero vacancies. A weekly check detects the break, but a person fixes it.
- **Permission.** Reusing the site's data in a paid product needs its permission (ADR 0013).

The goal is a source that needs neither: a stable, machine-readable format published for reuse.

## What was checked

Checked on 2026-11-23 with public documentation, the GitHub API and direct requests.

| Source                                             | Verified                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Not verified                                                                                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Querido Diário public API** (municipal gazettes) | Code is MIT licensed (API, scrapers and processing). Documentation asks for about 60 requests per minute and imposes no other restriction. **The API host has been broken for weeks**: TLS handshake failures since September ([issue 110](https://github.com/okfn-brasil/querido-diario-api/issues/110)) and HTTP 522 since 2026-10-19 ([issue 113](https://github.com/okfn-brasil/querido-diario-api/issues/113)), both open. The same failure reproduces from three different clients. | Response fields, the license of the data itself, current city coverage.                                                                                                |
| **Diário Oficial da União, via INLABS** (federal)  | Free by decree. Complete editions as XML and PDF, free since 2020. INLABS keeps the **last 4 months**; older editions are in the open-data collections. Automated download works through a documented login and a daily ZIP per section (DO1, DO2, DO3 and extras), with sample scripts in Bash and Python.                                                                                                                                                                               | Terms of use. INLABS requires an **account** (email and password). On 2026-11-23 it showed a maintenance notice, and the open-data collections page returned HTTP 502. |
| **Federal open-data portals**                      | The procurement API covers purchases, not competitions. The MGI competitions panel is a visual tool.                                                                                                                                                                                                                                                                                                                                                                                      | Whether any structured feed of competition notices exists.                                                                                                             |

Not found: an official API or RSS feed dedicated to public competition notices.

On 2026-11-23 the whole DOU portal was down, not only INLABS: the web reader (`in.gov.br/leiturajornal`)
also returned HTTP 502.

### Exam organizers

The large competitions are run by a handful of exam organizers ("bancas"), and each one publishes its
own competitions. They are the primary source of the notice, and an alert only repeats a title, an
organization and a link to a public act. Checked on 2026-11-23, with the project's identifying User-Agent:

| Organizer  | What it exposes                                                                                                                                                                                                                                                                                                                                                     | Usable                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Cebraspe   | The site is a single-page app backed by a **JSON API** (`apis.cebraspe.org.br/cebraspe/eventos/tipo/concursos/fase/<phase>`, phases `novos`, `inscricoes-abertas`, `em-andamento`). Each competition has a short name, total vacancies, maximum salary and year; the detail endpoint adds roles, the registration period and notice files. The API is undocumented. | Yes. Structured data, no HTML parsing. The format can still change without notice. |
| Cesgranrio | A WordPress site with a `concurso` post type in the **standard WordPress REST API** (`/wp-json/wp/v2/concurso`, 36 entries): title, link, publication and update dates. The body is page-builder markup, so roles and salary are not usable, and the list also holds university entrance exams that must be filtered out.                                           | Yes, for "a new competition was announced". The REST format is stable.             |
| FGV        | A Drupal page (`conhecimento.fgv.br/concursos`) listing ongoing and past competitions as title and link. `robots.txt` allows it. No feed or JSON for competitions.                                                                                                                                                                                                  | Yes, for title and link only. HTML parsing, but generic Drupal markup.             |
| Vunesp     | Answers 403 to the project's identifying User-Agent, while an anonymous one gets through: an anti-bot filter.                                                                                                                                                                                                                                                       | **No.** Getting around a block is not acceptable. Only with permission.            |
| FCC        | `robots.txt` disallows `/concursos/`.                                                                                                                                                                                                                                                                                                                               | **No.**                                                                            |

## Effort estimates

These are estimates, not measurements.

| Option                                      | What it takes                                                                                                                                                                                                                                                                                                                                                                                                                                    | Estimate                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| **Own DOU source** (a new `IVacancySource`) | Daily download of the XML, filter the notices that open competitions, extract organization, roles, salary and deadline from the free text, publish through the existing pipeline. No new infrastructure: the current MySQL and RabbitMQ are enough.                                                                                                                                                                                              | A few days for a first version, plus tuning. |
| **Self-host Querido Diário**                | The processing stack needs PostgreSQL, OpenSearch, MinIO, Apache Tika and the app, plus the API and the Scrapy spiders, all in Docker. That is several services and a memory-hungry search engine for a bot that only needs keyword filtering. **The real cost is the spiders**: one per municipality, each breaking when a city changes its site (the scrapers repository has hundreds of open issues). Self-hosting inherits that maintenance. | About a week to run, then continuous upkeep. |
| **Own municipal scraper**                   | Thousands of gazette formats. Not viable for one person.                                                                                                                                                                                                                                                                                                                                                                                         | Rejected.                                    |

## Decision

1. **Start with the exam organizers that allow it**, in this order: Cebraspe (JSON API, richest data),
   Cesgranrio (WordPress REST), FGV (HTML list). Each is a separate `IVacancySource` with a recorded
   fixture and the weekly live check, so one breaking does not affect the others. Organizers that block
   identified bots or disallow the path in `robots.txt` are left out.
2. **Add the DOU source when the portal is back.** It is federal, official, free by decree and needs
   no permission, and it covers competitions run by any organizer.
3. **Do not self-host Querido Diário now.** It adds five services and inherits the spider maintenance
   this decision is trying to escape. Revisit it for municipal coverage when the public API is healthy
   again, and consume it through the same port. Its failure must never affect the other sources.
4. **Keep the commercial source** as an optional extra, off by default in production (ADR 0013).

The organizers give a competition, not a vacancy per role: one alert per competition, with its areas
classified from the title and, for Cebraspe, from the role names. Salary filtering works only where a
salary is published (Cebraspe's maximum salary).

Both gazette sources publish **free text**, not structured vacancies. Extracting the fields from a
notice is the real work, and it is where maintenance moves to: from CSS selectors to extraction rules.
Two options, to be chosen after a measured trial on real notices:

- **Rules and patterns.** Free, deterministic, testable with fixtures, but covers fewer layouts.
- **An LLM with a validated schema (zod).** Tolerates layout changes, but costs per notice and can be wrong, so each result is validated and a sample is checked by hand.

## Consequences

- The DOU source needs one INLABS account, created by the project owner. Credentials are configuration
  (never committed), and the terms of use must be read before the source is enabled in production.
- INLABS is a government service with maintenance windows and a rolling four-month window. The
  source must tolerate an outage without losing days: it fetches by date and catches up on the next run.
- Coverage starts federal-only. State and municipal competitions are not covered until Querido
  Diário (or another source) is added.
- "No maintenance at all" is not achievable. This reduces how often something breaks: government
  XML changes rarely. The weekly check stays.

## Next steps

1. ~~Implement the Cebraspe source~~ Done: source id `cebraspe`, enabled through
   `SCRAPER_ENABLED_SOURCES`, tested against recorded responses and covered by the weekly live check.
   A competition's region comes from the state named in its short name ("PC PE 26" → PE); without
   one it is national, which also covers federal bodies. Next: Cesgranrio and FGV.
2. When the DOU portal is back: the project owner creates an INLABS account and reads its terms of use;
   then measure on a few weeks of real XML what share of notices open competitions and what rules extract.
3. Implement the DOU source behind a flag, with a fixture-based parser and a catch-up by date.
4. Re-check the Querido Diário API periodically; record the outcome here.

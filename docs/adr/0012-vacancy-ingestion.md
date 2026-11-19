# 0012. Vacancy ingestion: stable ids, publish before recording, several areas

Status: Accepted

## Context

The first scraper kept the ids it had seen in memory (so every restart announced everything
again), built an id from the title and the job concatenated, tagged a vacancy with exactly one
area, and mixed fetching, parsing, classification and publishing in one class. It also broke
silently when the site changed its markup.

## Decision

- A **use case** (`IngestVacanciesUseCase`) reads one or more `IVacancySource` adapters and
  announces what is new. Parsing lives in the adapter; classification and rules live in the domain
  and application layers.
- A vacancy id is the SHA-256 of the source and the **canonical address** of its page (fragment,
  trailing slash, tracking parameters and host case removed). The same listing always gets the same
  id and two sources can never collide.
- Known vacancies are stored in a `vacancies` table, so deduplication survives restarts and
  several instances.
- **Publish first, record after.** If the process dies in between, the vacancy is published again
  on the next run; the id is stable and notifications are idempotent, so this is harmless. The
  reverse order would lose the vacancy for good.
- A vacancy belongs to **every area with evidence** (a city hall can hire a teacher and an IT
  analyst). Matching uses any one of them, in the domain rule and in the SQL query.
- Cancelled competitions, competitions whose last registration day has passed, and regions that are
  not a Brazilian state are not announced. A source that fails does not stop the others.
- A source reports a layout change as a failure: when pages load but nothing can be parsed it
  throws, instead of quietly returning nothing.

## Consequences

- Restarts and concurrent runs no longer re-announce vacancies.
- The salary shown is the **ceiling** the listing states, compared with the subscriber's minimum;
  an hourly rate is ignored because it is not a monthly figure, and an unstated salary is stored
  as zero (shown as "not informed").
- Listings titled "Vários Cargos" (about 40% of a regional page) carry no role information, so they
  only reach subscribers who follow any area. Reading each detail page would fix that but
  multiplies the number of requests to the site.

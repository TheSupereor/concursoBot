# 0013. Vacancy source policy: polite by construction, opt-in in production

Status: Accepted. One decision is still open for the project owner before charging users (see
"Open question").

## Context

The only source today is PCI Concursos, a commercial aggregator of public-sector job listings. It
has no API and no feed. Its `robots.txt` allows crawling `/concursos/`, and no page describing terms
of use for automated access was found (only a privacy policy). Reading a third-party site is
technically easy and ethically not free: the site's owner pays for that traffic and earns from its
visitors, and the data is the product of their work.

## Decision

Make the scraper behave like a good guest, and make that behaviour part of the code rather than a
convention:

- **Identify honestly.** Every request carries `RadarConcursosBot/1.0 (+<repository url>)`, so the
  site can see who is reading it and where to complain.
- **Obey `robots.txt`** with RFC 9309 semantics: the group written for this bot replaces the
  wildcard group, no file (4xx) means allowed, a server error or a network failure means nothing is
  allowed for now. A page that is disallowed is not even requested.
- **Pace requests.** Five pages per run, with a pause between pages, a request timeout, and at
  least 15 minutes between runs in production (default one hour). One lock shared by all instances
  guarantees a single reader at a time.
- **Take the minimum.** Only listing metadata is read (organization, state, salary, deadline, link).
  No article text, no images. Every alert links back to the listing, which sends traffic to the
  source instead of replacing it.
- **Opt in, not opt out, in production.** No source is enabled in production until an operator lists
  it in `SCRAPER_ENABLED_SOURCES`. In development the PCI source is on by default.
- **Fail visibly.** A source throws when pages load but nothing can be parsed, and a weekly workflow
  reads the live site and fails when the parser no longer understands it.
- **Keep the source replaceable.** The ingestion use case depends on the `IVacancySource` port, so
  an official source can be added without touching the rest of the system.

## Open question

`robots.txt` permits crawling, but permission to fetch a page is not a licence to use its data in a
paid product. Before the paying-customers milestone (M3), the project owner should either obtain the
site's permission (a short message to the owner is the right first step) or rely on sources that
explicitly allow reuse. Official open sources, such as the federal official gazette and government
portals, are the natural candidates for new `IVacancySource` adapters. Until then PCI Concursos is
suitable for development, demonstration and a closed beta, not for charging customers.

## Consequences

- Reading the site stays cheap for its owner: about five requests an hour at the default settings.
- A change of layout is noticed within a week, and the failure is logged on every run until fixed.
- Because production is opt-in, deploying the application cannot start reading a third-party site by
  accident.
- Listings titled "Vários Cargos" (about 40% of a regional page) carry no role information; reading
  each detail page would fix that but multiplies the requests, so it is deliberately not done.

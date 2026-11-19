# 0010. Match subscribers in SQL, keep the domain rule as the source of truth

Status: Accepted

## Context

Each vacancy used to load every active subscriber with all their preferences and filter them in
memory with `Subscriber.hasInterest`. That does not scale: the cost of a vacancy grew with the
number of subscribers, not with the number of people who actually care about it.

## Decision

- `ISubscriberRepository.searchInterestedIn(vacancy)` returns the active subscribers that have at
  least one matching preference. The database evaluates the rule (area equal or `QUALQUER`, region
  equal or `BR`, vacancy salary at least the minimum) with an `EXISTS` subquery.
- The query still joins and loads **all** preferences of each match, so the repository returns
  complete aggregates rather than partial ones that could be saved back by mistake.
- The use case keeps calling `Subscriber.hasInterest` on the candidates. The database is a
  pre-filter; the domain rule remains the single source of truth.
- Two indexes support it: `(area, region, minimumSalary)` on `preferences` and `(isActive)` on
  `subscribers`, added by their own migration.

## Consequences

- The work per vacancy follows the number of matching subscribers.
- The rule exists in two places (domain and SQL). An integration test against a real MySQL
  compares them over 45 vacancy and preference combinations, so they cannot drift silently. A new
  matching criterion must be added to both, and the test will fail if only one is changed.
- The test needs a MySQL (`npm run test:integration`), which CI provides as a service.

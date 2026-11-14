# 0009. Architecture rules enforced in CI

Status: Accepted

## Context

A layering described only in documentation erodes: one convenient import is enough to couple the
domain to a framework. Reviewers should not have to catch that by eye.

## Decision

Encode the rules in `.dependency-cruiser.cjs` and run `npm run arch:check` in CI. The build fails
when the domain imports anything outside itself or any framework, when the application imports
infrastructure, wiring or a framework, when infrastructure imports the modules that compose it,
when test helpers are used outside specs, or when a circular dependency appears.

ORM entities are exempt from the circularity rule: bidirectional relations such as
`Subscriber` and `Preference` are circular by nature in TypeORM.

## Consequences

- The architecture in [`docs/architecture.md`](../architecture.md) is a checked fact.
- The rules were verified by introducing deliberate violations and confirming the check fails.
- Spec files are excluded from the graph on purpose, so tests may use frameworks and fakes freely.

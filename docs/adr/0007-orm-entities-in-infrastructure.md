# 0007. ORM entities live in infrastructure

Status: Accepted. Supersedes the earlier decision to keep ORM entities next to the domain
entities.

## Context

The project first kept TypeORM entities in `domain/entities` to avoid writing mappers. That put
framework decorators in the domain and made the layering a convention rather than a fact.

## Decision

- Domain entities and value objects are plain TypeScript.
- ORM entities live in `infrastructure/persistence/entities`.
- `SubscriberMapper` translates between the aggregate and its persistence model; repositories use
  it and return domain objects only.

## Consequences

- The domain and application layers have no TypeORM or NestJS imports, checked in CI
  ([0009](0009-architecture-rules-in-ci.md)).
- A small amount of mapping code to maintain, covered by tests (including MySQL returning
  `DECIMAL` as a string and a relation that was not loaded).
- Persistence details such as column names can change without touching the domain.

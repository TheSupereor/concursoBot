# 0011. Save the subscriber aggregate transactionally and keep preference ids stable

Status: Accepted

## Context

`save(subscriber)` built a brand new set of preference rows from the aggregate on every call, so
the ORM deleted the old rows and inserted new ones: ids changed on every save, even when only one
preference was added. A concurrent save of the same subscriber could also overwrite the other.

While testing this, a second problem surfaced: the `orphanedRowAction: 'delete'` option had been
placed on the `OneToMany` side, where TypeORM ignores it. Removed preferences were silently
detached (foreign key set to `NULL`) and left behind as orphan rows.

## Decision

- `save` runs in one transaction. It reads the persisted subscriber with its preferences under a
  write lock, so a concurrent save of the same subscriber waits.
- `SubscriberMapper.toOrm(subscriber, existing)` reuses the persisted row of a preference with the
  same area and region (same id, salary updated). New preferences are inserted and removed ones
  are deleted.
- `orphanedRowAction: 'delete'` lives on the `ManyToOne` side, and `preferences.subscriber` is
  `NOT NULL` with `ON DELETE CASCADE`, so an orphan can no longer exist and deleting a subscriber
  removes its preferences.

## Consequences

- Unchanged preferences keep their ids; only what really changed is written.
- A failed save leaves the previous state intact (covered by a test that forces an insert error).
- Integration tests against a real MySQL cover id stability, in-place salary updates, removal and
  cascading deletes.
- The pessimistic lock serialises writes per subscriber, which is fine at this volume.

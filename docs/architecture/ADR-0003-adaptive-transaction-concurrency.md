# ADR-0003: Adaptive transaction and concurrency

**Status:** Accepted — authorized test run; concurrency integration tests pass

## Context

Two activity submissions for the same child and skill can arrive close together. If both transactions calculate mastery from different snapshots, one can overwrite the other and lose learning evidence in the current mastery summary.

## Decision

- Insert the attempt, update affected mastery rows, and store the selected recommendation within one database transaction.
- Acquire a transaction-scoped per-child advisory lock before writes, then child-skill locks in sorted order before reading evidence.
- Keep the `skill_mastery.version` column as an additional optimistic-concurrency signal.
- Let the service caller own commit/rollback so Member 1 can align transaction scope with the FastAPI request.

## Consequences

- Different learners proceed independently. All submissions for one child serialize so cross-skill recommendations see consistent evidence.
- Updates for the same child-skill pair serialize until the first transaction completes.
- The repository is intentionally PostgreSQL-specific at the concurrency boundary.
- Integration and load tests must confirm acceptable wait times and absence of lost updates.

## Collaboration gate

- Member 1 reviews the request transaction boundary, timeout behavior, retry policy, and safe API error mapping.
- Member 3 writes a two-transaction concurrency test before declaring the adaptive endpoint production-ready.
- The full team accepts this PostgreSQL dependency as part of the project architecture.


The two-transaction test verifies no lost evidence and two committed recommendation audits. Exception injection verifies complete rollback. Load testing under provider-scale traffic remains a deployment concern; these tests do not establish a production latency SLA.

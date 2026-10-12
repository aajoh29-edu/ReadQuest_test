# ADR-0001: Project foundation

**Status:** Accepted — design gate pre-approved for this test run

## Context

ReadQuest needs a structure that separates HTTP concerns, database access, adaptive rules, and delivery infrastructure so three students can work concurrently without duplicating business logic.

## Decision

- Use Python 3.12, FastAPI, SQLAlchemy 2.x, PostgreSQL 16, Pytest, Docker Compose, and GitHub Actions.
- Use an application factory for FastAPI.
- Keep ORM models separate from API schemas.
- Keep adaptive calculations in pure domain functions; repositories obtain and persist data.
- Use environment variables prefixed with `READQUEST_`.
- Require PostgreSQL for integration tests; do not substitute SQLite for database behavior.

## Consequences

- Member 1 can build routes/services without owning database lifecycle code.
- Member 2 receives API contracts and does not reproduce adaptive logic.
- Member 3 can test algorithms independently and later connect them to transactional repositories.
- API contracts and role workflows are documented and tested; hosted merge policy remains an external setting.


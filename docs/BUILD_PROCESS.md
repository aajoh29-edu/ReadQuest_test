# ReadQuest build process and collaboration gates

The team should finish each process in order. A process is complete only when its technical exit criterion and collaboration gate are both satisfied.

## Process 1 — Repository foundation and architecture

**Member 3 work:** Create folders, environment conventions, API container, PostgreSQL container, liveness endpoint, test skeleton, and starter CI.

**Collaboration required:**

- **Member 1:** Approves FastAPI application factory, API folder boundary, Python version, health endpoint, and dependency-injection approach.
- **Member 2:** Supplies the future React build/start commands, port, and API base-URL requirements.
- **Full team:** Clones the repository and confirms the same startup result.

**Exit criterion:** The API test passes, the image builds, and `docker compose config` is valid.

## Process 2 — Requirements-to-ERD mapping

**Status:** Draft complete; awaiting the Member 1, Member 2, and full-team collaboration gate.

**Member 3 work:** Translate user stories into entities, relationships, constraints, indexes, data dictionary, and deletion rules.

**Collaboration required:**

- **Member 1:** Maps every endpoint to required reads/writes and validates transaction boundaries.
- **Member 2:** Confirms dashboard fields and activity/progress data needed by each screen.
- **Full team:** Approves child privacy choices and the ERD before model code begins.

**Exit criterion:** ERD v1 and data dictionary are reviewed; open questions are recorded as issues.

**Artifacts:** `ERD.md`, `readquest_erd.dot` (optional Graphviz source), `ERD_REVIEW_GUIDE.md`, `DATA_DICTIONARY.md`, `REQUIREMENTS_TRACEABILITY.md`, `OPEN_QUESTIONS.md`, and `ADR-0002-logical-data-model.md`.

## Process 3 — SQLAlchemy models and Alembic migrations

**Status:** Implementation complete; awaiting collaboration review and PostgreSQL CI.

**Member 3 work:** Implement typed models, relationships, constraints, indexes, initial migration, and upgrade/downgrade tests.

**Collaboration required:**

- **Member 1:** Reviews model names and confirms Pydantic/API schemas remain separate from ORM models.
- **Full team:** Coordinates migration merge order; no teammate edits an applied migration.

**Exit criterion:** A clean PostgreSQL database upgrades to `head`; model metadata has no unexpected migration diff.

## Process 4 — Repository/data-access layer

**Status:** Adaptive repositories complete; Member 1 must review service boundaries.

**Member 3 work:** Implement task-focused repositories and transaction utilities for attempts, mastery, and recommendations.

**Collaboration required:**

- **Member 1:** Co-designs service method signatures and owns route integration.
- **Member 2:** Reviews response examples through the API contract, not database objects.

**Exit criterion:** PostgreSQL integration tests prove insert, query, upsert, rollback, and constraint behavior.

## Process 5 — Deterministic seed data

**Status:** Implementation complete; awaiting authentication/content review and PostgreSQL CI.

**Member 3 work:** Create idempotent seeds for skills, lessons, activities, users, and named learner histories.

**Collaboration required:**

- **Member 1:** Confirms seeded users work with authentication and roles.
- **Member 2:** Confirms learner histories support every required screen and demonstration state.
- **Full team:** Agrees that content is age-appropriate and demo-safe.

**Exit criterion:** One command creates repeatable low, improving, inconsistent, mastered, and overdue-review cases.

## Process 6 — Mastery engine

**Status:** Implementation complete; formula requires full-team approval.

**Member 3 work:** Implement pure scoring functions, confidence handling, bands, configuration, and unit/property tests.

**Collaboration required:**

- **Full team:** Approves formula examples, thresholds, limitations, and wording. This is a product decision, not only a coding decision.
- **Member 1:** Integrates the function into the attempt transaction.
- **Member 2:** Designs understandable progress wording without recalculating scores.

**Exit criterion:** Tests cover boundaries and prove scores remain within 0–1 and deterministic for fixed inputs.

## Process 7 — Recommendation engine

**Status:** Implementation complete; explanation wording requires Member 2 review.

**Member 3 work:** Implement candidate filters, ranking components, deterministic tie-breaking, cooldowns, and reason codes.

**Collaboration required:**

- **Member 1:** Agrees the recommendation service input/output and error behavior.
- **Member 2:** Confirms explanation fields can be presented clearly to children and adults.
- **Full team:** Demonstrates representative scenarios and approves expected selections.

**Exit criterion:** Tests prove weak-skill priority, due review, difficulty fit, repetition control, ties, and no-candidate behavior.

## Process 8 — End-to-end adaptive transaction

**Status:** Implementation complete; Member 1 must review endpoint integration and transaction ownership.

**Member 3 work:** Guarantee that attempt persistence, mastery update, and recommendation audit commit or roll back together; test concurrency.

**Collaboration required:**

- **Member 1:** Co-owns the attempt endpoint and authenticated child context.
- **Member 2:** Connects activity submission and next-activity UI to the endpoint.
- **Full team:** Runs the vertical-slice demo.

**Exit criterion:** Child attempt → stored evidence → changed mastery → explainable recommendation works on `main`.

## Process 9 — Docker Compose development environment

**Status:** Backend/data services complete; frontend service awaits Member 2's Docker contract.

**Member 3 work:** Add migration, seed, API, database, and frontend services with health checks and named profiles.

**Collaboration required:**

- **Member 1:** Supplies API start, readiness, and migration requirements.
- **Member 2:** Supplies frontend build/runtime commands and environment variables.
- **Full team:** Runs the system from a fresh clone and reports missing documentation.

**Exit criterion:** A new contributor starts the project with documented commands and no local database installation.

## Process 10 — GitHub Actions CI

**Status:** Backend, PostgreSQL, architecture, and container jobs complete; frontend job awaits Member 2.

**Member 3 work:** Add lint, unit, PostgreSQL integration, migration, build, security, and smoke-test jobs.

**Collaboration required:**

- **Member 1:** Adds backend tests and agrees required checks.
- **Member 2:** Adds frontend tests/build and agrees required checks.
- **Full team:** Enables pull-request review and protects `main` from failing checks.

**Exit criterion:** Every pull request runs all relevant checks; failing code cannot merge.

## Process 11 — Deployment and release

**Status:** Container publication and optional deploy hook complete; provider configuration and team rehearsal remain.

**Member 3 work:** Configure protected environments, secrets, production migration, image deployment, health verification, rollback, and tagged release.

**Collaboration required:**

- **Member 1:** Verifies production configuration, CORS, authentication, logging, and readiness.
- **Member 2:** Verifies production API URL, assets, routing, and user workflows.
- **Full team:** Performs release rehearsal, signs off the demo, and keeps a local Compose fallback.

**Exit criterion:** A tagged release deploys, passes smoke tests, and has a rehearsed rollback procedure.

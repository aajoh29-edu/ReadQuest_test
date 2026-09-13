# ReadQuest backend: a code-structure training guide

**Audience:** teammates and future contributors who need to understand how the
ReadQuest backend is organized, what each part does, and why — before
extending it. This complements, and does not replace,
[`REMAINING_BUILD_PROCESSES.md`](REMAINING_BUILD_PROCESSES.md) (a hands-on
study checklist) and [`TEAM_REVIEW_CHECKLIST.md`](TEAM_REVIEW_CHECKLIST.md) (a
pre-merge gate).

**Last reviewed:** September 13, 2026, as part of a full backend code and
security review. See [Security review findings and fixes](#security-review-findings-and-fixes)
for what changed as a result.

---

## 1. What this project is

ReadQuest is an adaptive reading platform for children. A child answers
practice activities; the backend turns those answers into a per-skill
**mastery score** and uses that score to **recommend** the next activity. The
backend is the only place that formula lives — the frontend (not yet built)
is only ever supposed to *display* numbers the API already computed, never
recalculate them.

```text
React frontend (not yet built)
        |
        | REST/JSON
        v
FastAPI application  <-- you are here
        |
        | SQLAlchemy sessions
        v
PostgreSQL
```

The backend today deliberately implements a **vertical slice**, not a full
product: the data model, the adaptive algorithms, and the transaction that
ties them together are complete and tested; authenticated API routes for
day-to-day use (login, submitting an attempt over HTTP, teacher/parent
dashboards) are intentionally not built yet. Section 8 explains why that's a
deliberate boundary, not an oversight.

## 2. Directory tour

```text
backend/
  alembic/              Database migration scripts (schema history)
  app/
    core/config.py      Environment-driven settings (one object, everywhere)
    db/                 SQLAlchemy engine, session factory, declarative Base
    models/             ORM table definitions (the source of truth for schema)
    repositories/        SQL query logic, isolated from business rules
    services/adaptive/   Pure business logic: mastery + recommendation math
    api/routes/          FastAPI route handlers (currently: health/readiness)
    seeds/               Deterministic demo data for local development
    cli/                 Run the algorithms without a database or web server
    main.py              Application factory: builds and returns the FastAPI app
  tests/
    unit/                Fast tests for pure functions, no I/O
    integration/         Tests that need a real PostgreSQL database
    test_health.py, test_model_metadata.py, test_config.py
                         Fast tests that don't need a database
  pyproject.toml         Dependencies, tool config (pytest, ruff)
  Dockerfile             How the API is packaged as a container image
  alembic.ini            Alembic's own configuration file
```

Everything under `app/` is imported by `app/main.py`, directly or indirectly.
Nothing under `tests/` is imported by application code — tests only import
*from* `app`, never the reverse.

## 3. The layers, in the order data flows through them

### 3.1 `app/core/config.py` — settings

A single `Settings` object (Pydantic `BaseSettings`) reads environment
variables prefixed `READQUEST_` (for example `READQUEST_DATABASE_URL`), with
safe local-development fallbacks. `get_settings()` is `@lru_cache`d so the
whole process shares one instance instead of re-parsing the environment on
every call.

Nothing here talks to a database or the web framework — it is pure
configuration, which is what makes it safe to import from `alembic/env.py`,
`app/db/session.py`, and `app/main.py` alike without circular-import risk.

### 3.2 `app/db/base.py` and `app/db/session.py` — database plumbing

- `base.py` defines `Base`, the parent class every ORM model inherits from,
  plus a **naming convention** for indexes/constraints/foreign keys. Without
  this, PostgreSQL would pick auto-generated constraint names that differ
  from what Alembic expects, causing migration drift.
- `session.py` creates one SQLAlchemy `Engine` (a connection pool) and a
  `SessionFactory`. `get_db_session()` is a FastAPI dependency: it yields one
  `Session` per request and guarantees it's closed afterward (the `with`
  block), even if the request handler raises.

### 3.3 `app/models/` — the schema, as Python

Four files, split by domain area, mirroring the ERD
([`docs/architecture/ERD.md`](../architecture/ERD.md)):

| File | Tables | Responsibility |
|---|---|---|
| `identity.py` | `users`, `child_profiles`, `guardian_children`, `classes`, `enrollments` | Who the users are and how they relate (guardian ↔ child, teacher ↔ class) |
| `curriculum.py` | `skills`, `lessons`, `activities`, `activity_skills` | The content children practice, and which skill(s) each activity exercises |
| `learning.py` | `attempts`, `skill_mastery`, `recommendations` | The evidence a child generates, the score derived from it, and what gets suggested next |
| `enums.py` | — | Every fixed vocabulary (`UserRole`, `MasteryBand`, ...) as a Python `StrEnum`, so `"active"` is written once and reused everywhere |
| `mixins.py` | — | `CreatedAtMixin` / `TimestampMixin`: shared `created_at`/`updated_at` columns, added by inheritance instead of copy-paste |
| `types.py` | — | `database_enum()`: makes a SQLAlchemy `Enum` column store `"active"` (the enum's *value*), not `"ACTIVE"` (its Python member name) |

**Design points worth noticing when you read these files:**

- Every foreign key has an explicit `ondelete` (`RESTRICT`, `CASCADE`, or
  `SET NULL`) — nothing relies on the database's default (`NO ACTION`).
  `RESTRICT` dominates because most links here are evidence you must not
  silently lose (you can't delete a skill that attempts still reference).
- `CheckConstraint`s enforce numeric ranges (`grade_level BETWEEN 0 AND 12`,
  `score BETWEEN 0 AND 1`, ...) *in the database*, not only in application
  code — so a bug elsewhere (a bad migration, a manual `UPDATE`, a future
  script) can't quietly write an impossible value.
- `SkillMastery.__mapper_args__ = {"version_id_col": version}` turns on
  SQLAlchemy's **optimistic concurrency control**: if two processes read the
  same mastery row and both try to save, the second write fails loudly
  instead of silently overwriting the first. This matters because mastery
  updates happen inside a per-child-per-skill critical section (more in
  §3.5) — the version column is the backstop if that locking is ever bypassed.
- `test_model_metadata.py` in `tests/` cross-checks every table/column name
  against a hand-written expectation list. If you add a column here and
  forget the migration (or vice versa), that test — not a production
  incident — is what catches it.

### 3.4 `alembic/` — turning the models into a real database

`alembic/env.py` wires Alembic to `Base.metadata` and to `Settings`, so
`alembic revision --autogenerate` can diff "what the models say" against
"what the database has." `alembic/versions/0001_initial_schema.py` is the
first (and currently only) migration — it creates every enum type, table,
constraint, and index by hand (not autogenerated in this case, so column
order and constraint names are fully controlled).

Two rules the team has already agreed to (see
`REMAINING_BUILD_PROCESSES.md` §1):

- **Never edit a migration that has already been applied anywhere.** Add a
  new one instead — otherwise a teammate's local database and the one CI just
  migrated silently diverge.
- A migration isn't "done" until both `upgrade()` *and* `downgrade()` are
  proven against a disposable database (`tests/integration/test_migrations.py`
  does exactly this), and `alembic check` finds no drift between the models
  and the migration history.

### 3.5 `app/repositories/adaptive.py` — the only file that writes adaptive SQL

`AdaptiveRepository` is a thin, single-purpose data-access layer: every
query the adaptive transaction needs, and nothing else. Two methods deserve a
closer look:

- **`lock_adaptive_key(child_id, skill_id)`** takes a PostgreSQL *advisory
  lock* (`pg_advisory_xact_lock`) scoped to one child+skill pair, held for the
  rest of the transaction. This serializes concurrent attempts at the same
  skill (e.g. two browser tabs, or a retried request) so mastery is always
  recomputed from a consistent view of that child's attempt history, instead
  of two overlapping transactions racing to write it.
- **`save_mastery(...)`** additionally uses `SELECT ... FOR UPDATE`
  (`lock_mastery`) before writing, and relies on the `version` column
  described above. That's deliberate defense in depth: the advisory lock
  prevents most races by design; the row lock plus optimistic version column
  means that even a future code path which forgets to take the advisory lock
  fails safely (an error) instead of corrupting data silently.

Repositories know SQL; they don't know the mastery formula or the ranking
formula. That boundary is what keeps §3.6 database-free and trivially
testable.

### 3.6 `app/services/adaptive/` — the algorithms, with no I/O at all

This is the heart of "adaptive": two pure functions plus one orchestrator.

- **`mastery.py` → `calculate_mastery(attempts, window_size=10)`.** Takes a
  plain list of `(is_correct, occurred_at)` pairs — not ORM objects, not a
  database session — and returns a `MasteryResult` (score 0–1, band,
  confidence, the component sub-scores). The formula is documented inline:
  `0.60 × accuracy + 0.20 × recent performance + 0.20 × consistency`, where
  consistency is deliberately multiplied by accuracy so that "consistently
  wrong" can't earn credit just because its variance happens to be zero.
  Because this function touches no database or web framework, its unit tests
  (`tests/unit/test_mastery.py`) run in milliseconds and need no fixtures.
- **`recommendation.py` → `rank_activities(candidates, now=...)`.** Filters
  out unpublished, inaccessible, or recently-seen activities, then scores
  every remaining candidate on four weighted components (mastery gap, review
  timing via exponential decay, difficulty fit, variety) and returns them
  sorted, with deterministic tie-breaking by activity UUID string so output
  never depends on incidental row order.
- **`workflow.py` → `submit_attempt(session, command)`.** The one place that
  ties the pure algorithms to the repository: record the attempt, recompute
  mastery for every skill the activity touches (taking the advisory lock
  first), fetch recommendation candidates, rank them, and persist the top
  one. It does **not** call `session.commit()` — the docstring is explicit
  that the caller owns the transaction boundary (`with session.begin(): ...`)
  so a failure anywhere rolls the whole thing back atomically. This function
  is the one `tests/integration/test_seed_and_workflow.py` exercises against
  a real database.

### 3.7 `app/api/routes/health.py` and `app/main.py` — the web layer

`main.py`'s `create_app()` is a factory (not a bare module-level `FastAPI()`)
so tests can construct the app fresh, and so environment-specific behavior
(see §5) is computed once, explicitly, in one place. Today it registers only
`health_router`:

- `GET /health` — liveness: "the process is up," no dependencies checked.
- `GET /ready` — readiness: actually runs `SELECT 1` against PostgreSQL, and
  translates any `SQLAlchemyError` into a generic `503 {"detail": "database
  unavailable"}` — never the raw exception, which could otherwise leak
  connection strings, table names, or query text to a client.

This is the pattern every future authenticated route should follow: catch
the database-specific exception at the route boundary and translate it into
a safe, generic API error.

### 3.8 `app/seeds/demo.py` and `app/cli/adaptive_demo.py`

- **`seeds/demo.py`** creates a fixed, idempotent set of demo users, one
  child, one guardian link, 8 skills, and 16 activities, all keyed off
  deterministic UUIDs (`uid(101)`, `uid(311)`, ...) via `session.get(...)`
  existence checks — so running it twice never duplicates rows
  (`tests/integration/test_seed_and_workflow.py::test_seed_is_idempotent`
  proves exactly this). Its module docstring is explicit that
  `DEMO_PASSWORD_HASH = "DEMO_AUTH_NOT_CONFIGURED"` is a placeholder string,
  not a real password hash — it cannot be used to log in anywhere, which is
  intentional until real authentication exists.
- **`cli/adaptive_demo.py`** runs `calculate_mastery` and `rank_activities`
  against a few hand-built examples with no database at all. It's the
  fastest way to see the algorithms' output while learning the formulas —
  run it with `python -m app.cli.adaptive_demo`.

### 3.9 `tests/`

| Path | Needs PostgreSQL? | What it proves |
|---|---|---|
| `unit/test_mastery.py`, `unit/test_recommendation.py` | No | The formulas themselves: boundaries, cold start, tie-breaking, input validation |
| `test_health.py` | No | Liveness/readiness routes, including the database-unavailable path (via a fake session) |
| `test_model_metadata.py` | No | Every ERD table/column exists in SQLAlchemy metadata; every foreign key has an explicit delete rule; every numeric-range table has a check constraint |
| `test_config.py` | No | Settings refuse to start in "production" with the local-dev default database URL (added in this review — see §9) |
| `integration/test_migrations.py` | Yes | A disposable database upgrades to `head` and downgrades back to empty, cleanly |
| `integration/test_seed_and_workflow.py` | Yes | Seeding is idempotent; `submit_attempt()` persists an attempt, mastery, and a recommendation together |

Integration tests refuse to run against any database whose name doesn't end
in `_test` (`require_test_database()` / `prepare_database()`) — a guard rail
against accidentally pointing them at a development or production database.

## 4. Tracing one request end to end

The best way to really learn this codebase is to trace
`submit_attempt()` once, top to bottom:

1. A caller builds a `SubmitAttemptCommand` (child, activity, correct/
   incorrect, when it happened, the child's current level).
2. `workflow.submit_attempt()` validates the command's own invariants
   (`occurred_at` must be timezone-aware; `response_ms` must be in range),
   then asks the repository to insert the `Attempt` row.
3. It looks up every skill the activity is linked to
   (`activity_skill_ids`), and for **each** skill: takes the advisory lock,
   pulls that child's recent attempts for that skill
   (`recent_attempts_for_skill`), and calls the pure `calculate_mastery()`
   — no SQL inside that function, just the list of results.
4. The resulting `MasteryResult` is written back through
   `save_mastery()`, which locks the existing row (or creates one),
   overwrites it, and flushes — but does not commit.
5. `recommendation_candidates()` fetches every published, not-recently-seen
   activity/skill pair for that child, joined against whatever mastery
   exists so far (including the mastery just written in step 4).
6. The pure `rank_activities()` scores and sorts them; the top one (if any)
   is persisted as a `Recommendation` via `save_recommendation()`.
7. The caller — eventually, an authenticated HTTP route — wraps all of this
   in `with session.begin():` so steps 2–6 commit or roll back as one unit.

Notice how cleanly this maps onto the layers in §3: the workflow
orchestrates, the repository does SQL, the services do math, and none of the
three know about FastAPI, HTTP, or authentication.

## 5. Configuration and environments

`READQUEST_ENV` (`development`, by default) changes two things today:

- `app/main.py` hides `/docs`, `/redoc`, and `/openapi.json` when it equals
  `"production"` (see §9 — this used to hide only `/docs`).
- `app/core/config.py` refuses to start at all in `"production"` if
  `READQUEST_DATABASE_URL` still equals the built-in local-development
  default (see §9).

Every other setting (`app_name`, `app_version`, `log_level`,
`database_url`) is read once into the shared `Settings` object; nothing in
`app/` reads `os.environ` directly, which is what keeps configuration
testable and centrally auditable.

## 6. What's deliberately not here yet, and why

There are **no authenticated API routes** for submitting attempts, no login
endpoint, no role-based access control, and no React frontend in this
repository yet. That is a project-management decision, tracked in
[`docs/BUILD_PROCESS.md`](../BUILD_PROCESS.md) and
[`docs/learning/TEAM_REVIEW_CHECKLIST.md`](TEAM_REVIEW_CHECKLIST.md), not a
gap this review filled in:

- Authentication, RBAC, and the attempt endpoint require **product**
  decisions (how are children's accounts created? what does a parent vs.
  teacher vs. admin see?) that the checklist assigns to full-team review —
  writing that code without that decision would mean silently making the
  product call instead of the team.
- The React frontend has its own collaboration gate in
  [`frontend/README.md`](../../frontend/README.md): route structure, build
  command, and API base URL are Member 2's proposal to make first.

If you're picking up either of these next, start from
`docs/architecture/OPEN_QUESTIONS.md` and `TEAM_REVIEW_CHECKLIST.md` —
they list exactly what must be decided before writing the code.

## 7. Running things yourself

```bash
cd backend
python -m pip install -e ".[dev]"

ruff check .                          # lint
pytest -m "not integration"           # fast tests, no database needed
python -m app.cli.adaptive_demo       # see the algorithms run, no database

# with Docker (for the database-backed tests and the real API):
docker compose up --build
docker compose --profile seed run --rm seed
pytest                                 # everything, including integration tests
```

## 8. Suggested reading order for a new contributor

1. This document, once, end to end.
2. `app/models/enums.py` → `mixins.py` → `identity.py` → `curriculum.py` →
   `learning.py` (five minutes; the vocabulary of the whole system).
3. `app/services/adaptive/mastery.py` and its test file side by side.
4. `app/services/adaptive/recommendation.py` and its test file side by side.
5. `app/repositories/adaptive.py`, then `app/services/adaptive/workflow.py`
   — this is §4 above, in the actual code.
6. `app/api/routes/health.py` and `app/main.py` — the (currently small) web
   layer.
7. Run the commands in §7 yourself, in order.

## 9. Security review findings and fixes

A full pass was made over every backend file, the Alembic migration, the
Docker/Compose setup, and the GitHub Actions workflows, checking for the
usual categories: hardcoded secrets, SQL injection, unsafe defaults,
information disclosure, and missing hardening. Most of the codebase already
followed good practice — every SQL statement uses SQLAlchemy's expression
API or bound parameters (no string-built SQL anywhere), every foreign key
has an explicit delete rule, `.env` is git-ignored, and the placeholder demo
password hash is deliberately unusable. Four small, low-risk gaps were found
and fixed:

| # | Finding | Fix | File(s) |
|---|---|---|---|
| 1 | `Settings.database_url` had a working local-dev default (`readquest`/`readquest`@`localhost`). `compose.production.yaml` already forces an explicit URL via `:?Set READQUEST_DATABASE_URL`, but that guard is bypassed if the API image is ever started outside Compose — the app would then silently try the dev default instead of failing loudly. | Added a `model_post_init` check: if `environment == "production"` and `database_url` still equals the built-in default, `Settings()` raises `ValueError` at startup instead of running. Independent, defense-in-depth backstop to the Compose-level guard. | `app/core/config.py`, new test `tests/test_config.py` |
| 2 | Production mode hid `/docs` (Swagger UI) but left `/redoc` and `/openapi.json` reachable, still disclosing every route, request/response shape, and field name. | `docs_url`, `redoc_url`, and `openapi_url` are now all set to `None` together when `environment == "production"`. | `app/main.py` |
| 3 | `log_level` was a configured setting with no effect anywhere — nothing called `logging.basicConfig`, so it was silently ignored. | `create_app()` now applies `settings.log_level` via `logging.basicConfig(...)` at startup. | `app/main.py` |
| 4 | `ci.yml` didn't declare a `permissions:` block, so its jobs (which only checkout, lint, test, and build — never publish) ran with whatever the repository's default token permissions are, wider than needed. | Added a workflow-level `permissions: contents: read`, matching the least-privilege pattern `release.yml` already used. | `.github/workflows/ci.yml` |

A `backend/.dockerignore` was also added as defense in depth: the Dockerfile
already `COPY`s only named paths (`app/`, `alembic/`, `alembic.ini`,
`pyproject.toml`) rather than the whole build context, so nothing sensitive
was actually leaking into the image today — but the ignore file protects
against that changing later (e.g. someone switching to `COPY . .`) and keeps
the build context smaller either way.

**Explicitly not changed, and why:** there is no CORS middleware configured
anywhere. That is the *correct* secure default for a backend with no browser
frontend yet — adding permissive CORS now would only widen the attack
surface for no benefit, and the exact policy needed is Member 1's call once
the frontend's origin is known (tracked in `TEAM_REVIEW_CHECKLIST.md`).
Likewise, no authentication/password-hashing code was added — the existing
placeholder is intentionally inert, and building real authentication means
making product decisions (§6) that belong to the full team, not to a code
review.

All existing tests (19 → 22 after adding `test_config.py`) and `ruff check .`
pass after these changes; backend coverage remains above the CI's 75%
threshold (76.9%).

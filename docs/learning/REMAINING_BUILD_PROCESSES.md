# Team Member 3 remaining build processes

Use this as a coding and collaboration study guide. For each process, understand its responsibility, trace one example through the code, run the tests, and make one small controlled change.

## 1. Alembic migrations

**Goal:** Turn the logical ERD into a reproducible PostgreSQL schema. SQLAlchemy models describe the current structure; Alembic revisions describe how an existing database changes over time.

**Study:** `app/db/base.py`, `app/models/`, `alembic/env.py`, and `alembic/versions/0001_initial_schema.py`.

**Run:**

```bash
docker compose run --rm migrate
docker compose run --rm api alembic current
docker compose run --rm api alembic check
```

**Collaborate:** Member 1 reviews relationships, deletion behavior, service needs, and the separation between ORM models and API schemas. Member 2 confirms dashboard/activity fields. The full team coordinates migration branches and never edits an already-applied revision.

**Done when:** Empty-database upgrade, disposable-database downgrade, and `alembic check` all pass.

## 2. Seed data

**Goal:** Give every teammate the same deterministic development and demonstration scenarios. Seeds are fixtures, not production account creation.

**Study:** `app/seeds/demo.py` and `tests/integration/test_seed_and_workflow.py`.

**Run:** `docker compose --profile seed run --rm seed`.

**Collaborate:** Member 1 replaces placeholder hashes through the authentication flow. Member 2 confirms the learner/activity data supports planned screens. The full team reviews age appropriateness and demo wording.

**Done when:** Two runs produce exactly 4 users, 8 skills, and 16 activities without duplicates.

## 3. Mastery calculation

**Goal:** Convert attempt evidence into an explainable score, band, and confidence. The pure function has no web or database dependencies.

**Study:** `app/services/adaptive/mastery.py` and `tests/unit/test_mastery.py`.

Formula: `0.60 × accuracy + 0.20 × recent performance + 0.20 × consistency`.

**Collaborate:** The full team approves weights, score bands, cold-start wording, and the limitation that this is an educational software model rather than a clinically validated assessment. Member 1 integrates the function. Member 2 displays the server result without recalculating it.

**Done when:** Cold-start, boundaries, recent improvement, window size, and consistency tests pass.

## 4. Recommendation engine

**Goal:** Filter ineligible activities and rank eligible activities using mastery gap, review timing, difficulty fit, and variety.

**Study:** `app/services/adaptive/recommendation.py` and `tests/unit/test_recommendation.py`.

Formula: `0.55 × mastery gap + 0.25 × review due + 0.15 × difficulty fit + 0.05 × variety`.

**Collaborate:** Member 1 approves service input/output and no-candidate behavior. Member 2 confirms reason codes can become child-friendly and adult-friendly text. The full team reviews example rankings.

**Done when:** Filtering, ordering, deterministic ties, review timing, and validation tests pass.

## 5. Automated tests and adaptive transaction

**Goal:** Prove the algorithms and the complete attempt → mastery → recommendation workflow. The PostgreSQL advisory lock serializes updates to the same child-skill pair.

**Study:** `app/repositories/adaptive.py`, `app/services/adaptive/workflow.py`, `tests/unit/`, and `tests/integration/`.

**Collaborate:** Member 1 co-owns the attempt endpoint, authorization identity, transaction scope, and safe API errors. Member 2 tests submission and next-activity UI behavior. The full team agrees which checks block merging.

**Done when:** Unit, migration, seed, persistence, rollback, and workflow tests pass against PostgreSQL.

## 6. Docker Compose

**Goal:** Give every teammate PostgreSQL, migration, optional seed, and API services without a local database installation.

**Study:** `compose.yaml`, `compose.production.yaml`, `backend/Dockerfile`, and `Makefile`.

**Run:** `docker compose up --build`, then check `/health` and `/ready`.

**Collaborate:** Member 1 confirms API startup and readiness. Member 2 supplies the frontend Dockerfile, port, build command, and API URL. Every teammate must run the system from a fresh clone.

**Done when:** PostgreSQL becomes healthy, migration succeeds, API becomes ready, and optional seed completes.

## 7. GitHub Actions and deployment

**Goal:** Run pull-request quality gates and publish a tagged API container through a controlled release.

**Study:** `.github/workflows/ci.yml`, `.github/workflows/release.yml`, and `infra/DEPLOYMENT.md`.

**Collaborate:** Member 1 maintains backend/API tests and reviews production auth, CORS, logs, and errors. Member 2 adds frontend tests/build and validates workflows. Member 3 owns PostgreSQL CI, migrations, containers, release images, secrets wiring, smoke tests, and rollback. The full team protects `main` and rehearses release.

**Done when:** Pull-request jobs pass, a version tag publishes the image, migration and `/ready` succeed in deployment, and rollback is rehearsed.

## Suggested learning sequence

1. Run `python -m app.cli.adaptive_demo` inside the backend environment.
2. Read and run the pure algorithm tests.
3. Trace `submit_attempt()` from command to repository to stored outcome.
4. Compare one ORM model with its Alembic table definition.
5. Run seed twice and inspect counts.
6. Intentionally violate one constraint in the test database and study the error.
7. Open a small pull request and inspect every GitHub Actions job.


# ReadQuest

ReadQuest is an adaptive children's reading platform for Morgan State University's COSC 512 Software Engineering course. React presents reading activities and role-based dashboards; FastAPI authenticates sessions and authorizes relationships; PostgreSQL stores evidence, mastery and explained recommendations.

## Local demo

Requirements: Docker Engine with BuildKit and Compose 2.24.4+, or Python 3.12 and Node 24 for host development.

1. Copy `.env.example` to `.env`. Choose a throwaway 12–128 character `READQUEST_DEMO_PASSWORD` locally. Never commit the filled file. Leave it blank if demo users should not be able to sign in.
2. Run `docker compose up --build`.
3. In another terminal run `docker compose --profile seed run --rm seed`.
4. Open the frontend on port 8080. Sign in as `child@readquest.example.org`, `parent@readquest.example.org`, `teacher@readquest.example.org` or `admin@readquest.example.org`, using the password you supplied.
5. As a child, select an answer and choose **Check my answer**. View server-scored correctness, skill progress and **Try …** for the next recommendation. Parents see linked children; teachers see enrolled readers and classes; admins manage accounts and curriculum.

The seed creates four fictitious accounts, one reader/class, eight skills, sixteen reading activities, and five deterministic per-skill histories: low, improving, inconsistent, mastered and overdue review. Seeding twice does not duplicate evidence. Rotating the opt-in password revokes sessions. The anonymous legacy sample remains at `/demo.html` and the development `/demo` API contract remains available. These API routes are absent in production.

API liveness/readiness are on port 8000 at `/health` and `/ready`; development API documentation is at `/docs`. The frontend proxies `/api` to the backend, so no browser API hostname configuration is required. Production requires HTTPS termination and exact allowed origins.

## Test and build

```bash
make test                     # unit + disposable PostgreSQL tests, combined coverage >=75%
make frontend-test            # frozen npm install and component/API tests
make frontend-build
make smoke                    # requires READQUEST_DEMO_PASSWORD in process environment
make demo                     # pure adaptive CLI
make verify
```

`make test` tears down only test services; development data is preserved. Test failures leave test services available for diagnosis. Run `docker compose rm -fsv test test-db` afterward. Integration tests require a database whose name ends in `_test` and never use development data.

For host development:

```bash
uv venv --python 3.12 .venv
uv pip sync --python .venv/bin/python --require-hashes backend/requirements-dev.lock
source .venv/bin/activate
# Start only PostgreSQL with Compose, then from backend/:
alembic upgrade head
python -m app.seeds.demo
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
# In another terminal from frontend/:
npm ci
npm run dev
```

The host database URL defaults to the local development Compose database; the root `.env` contains the container hostname `db` and is not the backend's host configuration. For host seeding, supply the demo password securely in that command's environment. Vite runs on port 5173 and proxies `/api`. Use `python -m pytest` from `backend/` to import the checkout without needing an editable install.

Browser checks: from `frontend/`, install Chromium with `npx playwright install chromium`, then run `READQUEST_E2E_URL=<frontend-origin> READQUEST_E2E_PASSWORD=<your-local-demo-password> npm run test:e2e`. Supply the password through your shell environment rather than storing it in a script. A preinstalled Chromium can be selected with `READQUEST_BROWSER_PATH`. Tests create fictitious child/class records in the development database; use a disposable demo instance. The suite covers all roles, enrollment, mobile layout and an automated WCAG A/AA scan.

## Codex cloud networking

The cloud machine's Docker configuration directory must be writable. Export `DOCKER_CONFIG=/workspace/.readquest-docker`, create that directory, and run `python scripts/cloud_compose_override.py`. The helper writes a cloud-only override outside the checkout with platform proxy DNS mappings, host build networking and an existing public CA bundle. It writes no credentials and preserves TLS and package integrity verification.

Use `docker compose -f compose.yaml -f /workspace/readquest-cloud.yaml up --build`, or `make COMPOSE='docker compose -f compose.yaml -f /workspace/readquest-cloud.yaml' start`. Recreate the override when platform networking changes. Normal developer machines and GitHub runners do not need this override. After generating the override, you can also export `COMPOSE_FILE=/workspace/ReadQuest_test/compose.yaml:/workspace/readquest-cloud.yaml` and use ordinary `docker compose`/`make` commands. Uninitialized cloud builds fail DNS resolution; initialized builds and an isolated empty-volume instance are checked in the verification report.

## Architecture and release

Start with [system models](docs/models/WORKFLOWS.md), [exact ERD](docs/models/ERD.md), [production design](docs/architecture/PRODUCTION_DESIGN.md), [API contract](docs/architecture/API_CONTRACT.md), [task tracker](docs/TASK_TRACKER.md) and [verification](docs/VERIFICATION_REPORT.md). The learning guide explains each backend layer and security findings. `bridge/` is an archived Docker Desktop Kubernetes export, not the production target; see [its limitations](bridge/README.md).

Production setup and rollback are described in [infra/DEPLOYMENT.md](infra/DEPLOYMENT.md). Provision the first admin explicitly with `python -m app.cli.create_admin`. Do not seed production. The local test run does not publish a release, configure a hosting provider or enable hosted branch protection.

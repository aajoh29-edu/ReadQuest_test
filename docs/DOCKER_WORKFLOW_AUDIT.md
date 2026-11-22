# Docker workflow audit

Audited on the `chore/dockerize-build` branch before converting the project to a
Docker-first workflow.

## Existing-file inventory

- `Dockerfile`: frontend npm build plus Nginx runtime.
- `backend/Dockerfile`: Python 3.15 install and combined migration/seed/server
  startup command.
- `compose.yaml`: PostgreSQL, backend, and production-style Nginx frontend.
- `.dockerignore`: root-only image exclusions.
- `package.json`: host npm dev, build, lint, audit, and cleanup commands.
- `README.md`, `backend/README.md`, and `DEPLOYMENT.md`: host-toolchain run
  instructions.

The repository did **not** contain a `Makefile`, `compose.production.yaml`,
`.github/workflows/`, or `bridge/` despite the requested baseline.

## Command replacement matrix

| Current command | Where it runs today | Docker replacement |
| --- | --- | --- |
| `npm install` / `npm ci` | Host Node/npm | Pinned Node `deps` target and frontend image builds |
| `npm run dev` | Host Vite on port 3000 | Frontend `dev` target in development Compose on port 8080 |
| `npm run lint` | Host TypeScript executable | Frontend `check` target in test Compose |
| `npm run build` | Host Vite, writes `dist/` | Frontend `build` target; runtime image copies `dist/` from it |
| `npm run clean` | Host Node filesystem script | Containerized cleanup via Makefile/Compose |
| `npm audit` | Host npm with lockfile | Frontend audit target in test Compose |
| `python -m pip install -e ".[dev]"` | Host Python 3.11+ / 3.15 venv | Backend pinned `deps`/`dev` targets |
| `python -m pytest -q` | Host Python, from root or `backend/` | Backend `test` target with isolated PostgreSQL |
| `python -m app` / uvicorn | Host Python | Backend `dev` or `runtime` target |
| `alembic upgrade head` | Host Python | One-shot `migrate` Compose service |
| `python -m app.seeds.demo` | Host Python / SQLite or PostgreSQL | `seed` profile service using the same backend image |
| `docker compose up --build -d` | Host Docker, production-style stack only | `make up` development stack and `make prod` production stack |

## Flags and findings

- The README has Windows PowerShell instructions and local Node/Python
  prerequisites; these must become Docker-first WSL Ubuntu instructions.
- `VITE_DEV_API_TARGET` is configured for a host-local backend rather than the
  Compose service name.
- The root `clean` npm script is cross-platform now, but it still deletes host
  files rather than operating entirely in containers.
- No Bun command or Bun lockfile remains.
- No `rm -rf`, `cp`, or `mv` command currently appears in npm scripts.
- Frontend and backend Dockerfiles do not use explicit digest-pinned base images,
  and the backend uses Python 3.15 even though Python 3.12/3.13 is requested for
  CI/production compatibility.
- Root `.dockerignore` covers the frontend but not a dedicated backend build
  context.
- `compose.yaml` hardcodes development PostgreSQL credentials and the database
  URL. They are non-production defaults, not real secrets, but configuration
  still belongs in `.env`.
- No real secrets, API keys, or tokens are committed. SMTP placeholders are
  documentation only.
- No bridge process exists, so no bridge container is required.

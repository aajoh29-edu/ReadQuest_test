# Junior Developer Setup Guide

This guide gets ReadQuest running on Windows with WSL2 and Ubuntu. You do not
need to install Node.js, npm, Bun, Python, or PostgreSQL on your computer. Docker
runs every project toolchain.

## 1. Install the prerequisites

You need:

- Windows 10/11 with WSL2.
- An Ubuntu WSL distribution.
- Docker Desktop with **Settings > Resources > WSL Integration** enabled for
  Ubuntu, or Docker Engine installed inside Ubuntu.
- GNU Make.

Open an Ubuntu terminal and verify Docker:

```bash
docker version
docker compose version
```

Both commands must work and the Docker server must be shown as running. If Docker
Desktop is installed, start it before continuing.

Install Make if `make --version` reports that the command is missing:

```bash
sudo apt-get update
sudo apt-get install -y make
```

## 2. Put the repository in Ubuntu

A native Linux path is recommended:

```bash
mkdir -p ~/projects
cd ~/projects
git clone <repository-url> ReadQuest
cd ReadQuest
```

Using the repository through `/mnt/c/...` or `/mnt/d/...` is supported, but file
watching and container bind mounts will be slower. Do not move an existing
checkout without coordinating with your team.

## 3. Create your local environment file

From the repository root:

```bash
cp .env.example .env
```

`.env` is intentionally ignored by Git. For local-only development, change
`POSTGRES_PASSWORD` in `.env` from its placeholder. Leave the development ports
and `VITE_*` values unchanged initially.

Never put secrets in a `VITE_*` variable. Vite includes those values in the
JavaScript sent to the browser.

## 4. Build and start the application

Run:

```bash
make build
make up
make seed
```

What these commands do:

1. `make build` builds the development, test, audit, and production Docker
   images.
2. `make up` starts PostgreSQL, applies database migrations, starts FastAPI, and
   starts the Vite hot-reload server.
3. `make seed` loads demo lessons, activities, books, and reading texts.

The first build can take several minutes while Docker downloads base images and
dependencies. Later builds reuse cached layers.

## 5. Confirm the application is working

Open:

- Frontend: <http://localhost:8080>
- Backend health: <http://localhost:8000/health>
- API documentation: <http://localhost:8000/docs>
- Demo activities: <http://localhost:8000/demo/activities>

Check the services and logs from the terminal:

```bash
docker compose ps
make logs
```

Exit logs with `Ctrl+C`; this does not stop the application.

To confirm the frontend can reach the backend through the same origin:

```bash
curl http://localhost:8080/api/v1/curriculum/levels
```

## 6. Everyday development workflow

Start the stack:

```bash
make up
```

Frontend files under `src/` and backend files under `backend/app/` are
bind-mounted into their containers. Save a file and Vite or Uvicorn should
reload automatically.

Useful commands:

```bash
make logs   # Follow development logs
make test   # Run backend and frontend tests in containers
make audit  # Audit npm and Python dependencies
make build  # Rebuild all image targets
make seed   # Re-run the idempotent demo seed
make down   # Stop services but preserve the development database
```

Do not run `npm install`, `pytest`, or Python seed commands directly on the
host. Use the Make targets so local and CI behavior stays identical.

## 7. Make a change

1. Create a branch before editing:

   ```bash
   git switch -c your-name/short-task-name
   ```

2. Save the frontend or backend change.
3. Check the browser and `make logs`.
4. Run verification:

   ```bash
   make test
   make audit
   ```

5. Review and commit only the intended files:

   ```bash
   git status --short
   git diff
   git add <files>
   git commit -m "Describe the change"
   ```

Never commit `.env`, credentials, database files, `node_modules/`, virtual
environments, or `dist/`.

## 8. Reset the application

To stop services without deleting data:

```bash
make down
```

To remove ReadQuest containers, volumes, and generated build output:

```bash
make clean
```

Recreate a clean development database:

```bash
make up
make seed
```

`make clean` deletes local database data, so ask before running it when other
developers share the environment.

## 9. Common problems

### Docker cannot connect

Start Docker Desktop. In Docker Desktop settings, enable integration for the
Ubuntu distribution. Restart WSL if needed:

```powershell
wsl --shutdown
```

Then reopen Ubuntu and re-run `docker version`.

### A port is already in use

Change the relevant value in `.env`:

```text
DEV_FRONTEND_PORT="8080"
DEV_BACKEND_PORT="8000"
PROD_FRONTEND_PORT="8081"
PROD_BACKEND_PORT="8001"
```

Run `make down` and then `make up`.

### Database migration or seed fails

Inspect the service logs:

```bash
make logs
docker compose logs migrate db backend
```

If the failure is caused by stale local data, confirm it is safe to reset and
then run `make clean`, `make up`, and `make seed`.

### Hot reload is slow under `/mnt/c` or `/mnt/d`

Keep `CHOKIDAR_USEPOLLING=true` in `.env`. For the best experience, clone the
repository into `~/projects/ReadQuest`.

### Shell or Makefile line-ending errors

Do not convert repository shell, Docker, Python, TypeScript, YAML, or Make
files to CRLF. `.gitattributes` enforces LF line endings. Run:

```bash
git add --renormalize .
```

Review the resulting diff with a teammate before committing it.


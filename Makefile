.PHONY: help start stop migrate seed test test-unit demo verify

help:
	@echo "start      Start PostgreSQL, migrations, and API"
	@echo "stop       Stop containers without deleting data"
	@echo "migrate    Apply Alembic migrations"
	@echo "seed       Load repeatable demonstration data"
	@echo "test       Run all backend tests (unit + integration) in Docker"
	@echo "test-unit  Run tests that do not require PostgreSQL"
	@echo "demo       Run the adaptive algorithm demonstration"
	@echo "verify     Validate architecture docs and Python syntax"

start:
	docker compose up --build

stop:
	docker compose down

migrate:
	docker compose run --rm migrate

seed:
	docker compose --profile seed run --rm seed

# Builds the backend/Dockerfile `test` stage (dev deps + tests baked in) and
# runs it against a throwaway `test-db` container, then tears both down.
# Split into two pytest invocations, same as CI (.github/workflows/ci.yml):
# the DB URL is only passed for the integration pass, because setting it
# unconditionally would break the config tests that assert what happens when
# it is *not* set.
# Works the same under Windows (with GNU Make on PATH, e.g. via Git for
# Windows, Chocolatey, or WSL) and Linux/macOS: every recipe here is a single
# docker compose invocation, nothing shell-specific.
TEST_DB_URL = postgresql+psycopg://readquest:readquest@test-db:5432/readquest_test

# Note: teardown targets only test/test-db by name (`rm -fsv`), never
# `down`, so a developer's running db/api containers and the persistent
# readquest_postgres_data volume are never touched by `make test`.
test:
	docker compose --profile test build test
	docker compose --profile test run --rm test pytest -v -m "not integration"
	docker compose --profile test run --rm -e READQUEST_DATABASE_URL=$(TEST_DB_URL) -e READQUEST_TEST_DATABASE_URL=$(TEST_DB_URL) test pytest -v -m integration
	docker compose rm -fsv test test-db

test-unit:
	docker compose --profile test build test
	docker compose --profile test run --rm test pytest -v -m "not integration"
	docker compose rm -fsv test test-db

demo:
	docker compose run --rm api python -m app.cli.adaptive_demo

verify:
	python scripts/validate_erd_docs.py
	python -m compileall -q backend/app backend/tests scripts


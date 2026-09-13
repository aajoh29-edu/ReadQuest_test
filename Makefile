.PHONY: help start stop migrate seed test test-unit demo verify

help:
	@echo "start      Start PostgreSQL, migrations, and API"
	@echo "stop       Stop containers without deleting data"
	@echo "migrate    Apply Alembic migrations"
	@echo "seed       Load repeatable demonstration data"
	@echo "test       Run all backend tests"
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

test:
	docker compose run --rm api pytest

test-unit:
	docker compose run --rm api pytest -m "not integration"

demo:
	docker compose run --rm api python -m app.cli.adaptive_demo

verify:
	python scripts/validate_erd_docs.py
	python -m compileall -q backend/app backend/tests scripts


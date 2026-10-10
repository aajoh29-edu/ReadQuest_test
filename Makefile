.PHONY: help start stop migrate seed test test-unit frontend-test frontend-build smoke demo verify
# Override for cloud-only build networking, for example:
# make COMPOSE='docker compose -f compose.yaml -f /workspace/readquest-cloud.yaml' start
COMPOSE ?= docker compose
TEST_DB_URL = postgresql+psycopg://readquest:readquest@test-db:5432/readquest_test

help:
	@echo "start/stop: development stack; seed: deterministic demo (opt-in password)"
	@echo "test: all backend tests; frontend-test/build: React checks; smoke: authenticated proxy workflow"

start:
	$(COMPOSE) up --build
stop:
	$(COMPOSE) down
migrate:
	$(COMPOSE) run --rm migrate
seed:
	$(COMPOSE) --profile seed run --rm seed

test:
	$(COMPOSE) --profile test build test
	$(COMPOSE) --profile test run --rm test sh -ec 'python -m pytest -m "not integration" --cov=app --cov-report=term && READQUEST_DATABASE_URL=$(TEST_DB_URL) READQUEST_TEST_DATABASE_URL=$(TEST_DB_URL) python -m pytest -m integration --cov=app --cov-append --cov-report=term --cov-fail-under=75'
	$(COMPOSE) rm -fsv test test-db

test-unit:
	$(COMPOSE) --profile test build test
	$(COMPOSE) --profile test run --rm test python -m pytest -m "not integration"
	$(COMPOSE) rm -fsv test test-db
frontend-test:
	npm --prefix frontend ci
	npm --prefix frontend test
frontend-build:
	npm --prefix frontend run build
smoke:
	python scripts/smoke.py
demo:
	$(COMPOSE) run --rm api python -m app.cli.adaptive_demo
verify:
	python scripts/validate_erd_docs.py
	python -m compileall -q backend/app backend/tests scripts

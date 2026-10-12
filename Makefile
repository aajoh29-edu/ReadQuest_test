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
	READQUEST_COMPOSE_COMMAND='$(COMPOSE)' bash scripts/test-backend.sh

test-unit:
	READQUEST_COMPOSE_COMMAND='$(COMPOSE)' bash scripts/test-backend.sh unit
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

SHELL := /bin/sh

COMPOSE := docker compose
TEST_COMPOSE := docker compose -f compose.test.yaml
PRODUCTION_COMPOSE := docker compose -f compose.production.yaml
CLEAN_IMAGE := node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee

.PHONY: up down build seed test audit clean logs prod

up:
	$(COMPOSE) up --build -d db migrate backend frontend

down:
	$(COMPOSE) down --remove-orphans

build:
	$(COMPOSE) --profile seed build
	$(TEST_COMPOSE) build backend-test frontend-test backend-audit frontend-audit
	PROD_POSTGRES_PASSWORD=$${PROD_POSTGRES_PASSWORD:-build-placeholder} $(PRODUCTION_COMPOSE) build

seed:
	$(COMPOSE) --profile seed run --rm seed

test:
	@set -eu; \
	trap '$(TEST_COMPOSE) down --remove-orphans --volumes >/dev/null 2>&1 || true' EXIT; \
	$(TEST_COMPOSE) run --build --rm backend-test; \
	$(TEST_COMPOSE) run --build --rm frontend-test

audit:
	@set -eu; \
	trap '$(TEST_COMPOSE) down --remove-orphans --volumes >/dev/null 2>&1 || true' EXIT; \
	$(TEST_COMPOSE) run --build --rm frontend-audit; \
	$(TEST_COMPOSE) run --build --rm backend-audit

clean:
	docker compose -p readquest down --remove-orphans --volumes
	$(COMPOSE) down --remove-orphans --volumes
	$(TEST_COMPOSE) down --remove-orphans --volumes
	PROD_POSTGRES_PASSWORD=$${PROD_POSTGRES_PASSWORD:-clean-placeholder} $(PRODUCTION_COMPOSE) down --remove-orphans --volumes
	docker run --rm -v "$$(pwd):/workspace" -w /workspace $(CLEAN_IMAGE) sh -c 'rm -rf dist server.js'

logs:
	@status=0; \
	$(COMPOSE) logs --follow || status=$$?; \
	[ "$$status" -eq 0 ] || [ "$$status" -eq 130 ]

prod:
	$(COMPOSE) down --remove-orphans
	$(PRODUCTION_COMPOSE) up --build -d db migrate backend frontend

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# A checkout-local lock covers build, tests and disposable DB cleanup.
# All backend Compose test entry points must use this wrapper.
exec 9> .readquest-db-tests.lock
flock --exclusive 9
# Supports Make's existing COMPOSE override without shell eval.
read -r -a compose <<< "${READQUEST_COMPOSE_COMMAND:-docker compose}"
cleanup() { "${compose[@]}" rm -fsv test test-db; }
trap cleanup EXIT
"${compose[@]}" --profile test build test
if [[ "${1:-all}" == unit ]]; then
  "${compose[@]}" --profile test run --rm test python -m pytest -m 'not integration'
else
  "${compose[@]}" --profile test run --rm test sh -ec '
    export PYTEST_ADDOPTS=""
    python -m pytest -m "not integration" --cov=app --cov-report=term
    export READQUEST_DATABASE_URL=postgresql+psycopg://readquest:readquest@test-db:5432/readquest_test
    export READQUEST_TEST_DATABASE_URL="$READQUEST_DATABASE_URL"
    python -m pytest -m integration --cov=app --cov-append --cov-report=term --cov-fail-under=75
  '
fi

#!/usr/bin/env bash
set -euo pipefail
# Run after builds finish. Never prune volumes, containers or tagged images.
docker system df
docker builder prune --force --filter 'until=24h'
docker image prune --force --filter 'until=24h'
docker system df

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
printf '\n== Container status ==\n'
docker compose ps
printf '\n== Installed tools (inside workstation) ==\n'
docker compose exec -T desktop bash -lc '
  set -e
  echo "user=$(id developer)"
  node --version
  npm --version
  python3 --version
  git --version
  psql --version
  if command -v code >/dev/null; then code --version | head -n 1; fi
  test -d /workspace/readquest
  echo "Workspace mounted: /workspace/readquest"
  nc -z 127.0.0.1 3389
  echo "Local XRDP socket: reachable"
'
printf '\n== Port exposure ==\n'
docker port readquest-dev-xrdp 3389/tcp
printf '\n== ReadQuest Git branch (if it is a Git repository) ==\n'
docker compose exec -T -u developer desktop bash -lc \
  'cd /workspace/readquest && git branch --show-current || true'

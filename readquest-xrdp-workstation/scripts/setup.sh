#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo 'ERROR: Docker CLI not found. Enable Docker Desktop WSL2 integration first.' >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo 'ERROR: Docker engine unavailable. Start Docker Desktop and enable WSL integration.' >&2
  exit 1
fi

readquest_dir="${READQUEST_DIR:-/mnt/d/projects/readquest/readquest-xrdp-workstation}"
if [[ ! -d "$readquest_dir" ]]; then
  echo "ReadQuest directory is absent: $readquest_dir" >&2
  echo 'Clone or copy ReadQuest into the WSL Linux filesystem first (see README).' >&2
  exit 1
fi
readquest_dir="$(cd "$readquest_dir" && pwd -P)"
if [[ "$readquest_dir" == /mnt/* ]]; then
  echo 'WARNING: Project on /mnt/... Windows drive; WSL Linux filesystem is recommended.' >&2
fi

umask 077
mkdir -p .secrets
if [[ ! -s .secrets/rdp_password ]]; then
  if [[ ! -t 0 ]]; then
    echo 'ERROR: First-time setup needs interactive RDP password entry.' >&2
    exit 1
  fi
  while true; do
    read -r -s -p 'Create RDP password (12+ chars; no colon): ' pass
    printf '\n'
    read -r -s -p 'Repeat RDP password: ' confirm
    printf '\n'
    if [[ "$pass" == "$confirm" && ${#pass} -ge 12 && "$pass" != *:* && "$pass" != *$'\n'* ]]; then
      printf '%s\n' "$pass" > .secrets/rdp_password
      unset pass confirm
      break
    fi
    echo 'Passwords differ or do not meet requirements. Retry.' >&2
  done
fi
chmod 600 .secrets/rdp_password
printf 'READQUEST_DIR=%s\nDEV_UID=%s\nDEV_GID=%s\nRDP_PORT=3390\nINSTALL_VSCODE=true\n' \
  "$readquest_dir" "$(id -u)" "$(id -g)" > .env
chmod 600 .env

echo 'Configuration created. Validating Docker Compose...'
docker compose config --quiet
echo 'Building and starting XRDP workstation...'
docker compose up -d --build
echo 'Workstation startup requested. Check status with: docker compose ps'
echo 'Launch Windows Remote Desktop: mstsc /v:localhost:3390'
echo 'Login: developer / password entered during setup / Xorg session'

# Source this file: source scripts/cloud-compose-env.sh
# Keep platform proxy and SSL_CERT_FILE bindings inherited from the environment.
_readquest_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export DOCKER_CONFIG="${DOCKER_CONFIG:-/workspace/.readquest-docker}"
export COMPOSE_FILE="${_readquest_root}/compose.yaml:/workspace/readquest-cloud.yaml"
mkdir -p "$DOCKER_CONFIG"
python "${_readquest_root}/scripts/cloud_compose_override.py" --output /workspace/readquest-cloud.yaml || return 1
docker compose config --quiet || return 1
unset _readquest_root

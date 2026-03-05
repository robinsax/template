#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

# Populate env.
if [[ -f .env ]]; then
    source .env
    export $(grep -v '^#' .env | xargs)
fi

if [[ -f .env.platforms ]]; then
    source .env.platforms
    export $(grep -v '^#' .env.platforms | xargs)
fi

export POSTGRES_PORT=5433
export POSTGRES_URI="postgresql://admin:admin@localhost:$POSTGRES_PORT/main"
export API_PORT=8500
export AUTH_TOKEN_HMAC_KEY="rjv40P742AP_16-Z2VOR3nJibqVrn9R6qyvEq3fwkBo="
export FLOW_TEST_MODE="true"

# Prep API runtime.
if [[ -d backend/.storage ]]; then
    rm -rf backend/.storage
fi
mkdir backend/.storage
chmod 777 backend/.storage

# Boot compose project.
pushd infra/local

docker compose \
    -p flow_tests \
    down \
    -v

docker compose \
    -p flow_tests \
    -f docker-compose.services.yaml \
    up -d \
    --build \
    api postgres

popd

pushd backend

# Run migrations.
python3 -m alembic upgrade head

# Development shell.
set +e
bash
set -e

popd

pushd infra/local

docker compose \
    -p flow_tests \
    down \
    -v

popd
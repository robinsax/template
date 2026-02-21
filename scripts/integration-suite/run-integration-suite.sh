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
export ENCRYPTION_KEY="xn7MwEMY1l7G9dItXwzn5F6NK80WrSuv_n2lSKXDwHc="
export AUTH_TOKEN_HMAC_KEY="rjv40P742AP_16-Z2VOR3nJibqVrn9R6qyvEq3fwkBo="
export INTEGRATION_TEST_MODE="true"

# Prep API build and runtime.
if [[ -d backend/common ]]; then
    rm -rf backend/common
fi
cp -rf common backend/common

if [[ -d backend/.storage ]]; then
    rm -rf backend/.storage
fi
mkdir backend/.storage
chmod 777 backend/.storage

# Boot compose project.
pushd infra/local

docker compose \
    -p integration_suite down \
    -v

docker compose \
    -p integration_suite \
    -f docker-compose.services.yaml \
    up -d \
    --build \
    api postgres

popd

pushd backend

# Run migrations.
python3 -m alembic upgrade head

# Run integration suite.
set +e
python3 integration_suite run asserts \
    -r http://localhost:$API_PORT/api/v1 \
    --no-dump
exit_code=$?
set -e

# We just output a lot of logs, let CI context catch up.
sleep 3

popd

# Teardown compose project.
pushd infra/local

docker compose \
    -p integration_suite \
    -f docker-compose.services.yaml \
    down \
    -v

popd

exit $exit_code

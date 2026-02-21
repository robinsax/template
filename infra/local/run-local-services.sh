#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

if [[ -d app/common ]]; then
    rm -rf app/common
fi
if [[ -d backend/common ]]; then
    rm -rf backend/common
fi

cp -r common app/
cp -r common backend/

if [[ -f .env ]]; then
    source .env
    export $(grep -v '^#' .env | xargs)
fi

if [[ -f .env.platforms ]]; then
    source .env.platforms
    export $(grep -v '^#' .env.platforms | xargs)
fi

pushd infra/local

docker-compose \
    -f docker-compose.services.yaml \
    up --build

popd

#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

docker build -t psql:local .

docker run \
    -it --rm \
    --network dev_local \
    -e POSTGRES_URI=postgresql://admin:admin@postgres:5432/main \
    psql:local

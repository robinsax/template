#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

message=$1

source .venv/bin/activate

pushd backend

python3 -m alembic revision --autogenerate -m "$message"

popd

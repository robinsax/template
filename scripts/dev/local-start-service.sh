#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

source .venv/bin/activate

service=$1

pushd backend

python3 backend serve --service $service

popd

#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

source .venv/bin/activate

pushd backend

python3 kedet serve --service streams

popd

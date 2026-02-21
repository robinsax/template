#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

source .venv/bin/activate

pushd backend

python3 -m pdoc kedet -p 7900

popd

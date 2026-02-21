#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

source .venv/bin/activate

python3 -m pylint --rcfile .pylintrc backend/kedet

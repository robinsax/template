#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

source .venv/bin/activate

python3 scripts/codegen/collect_en_locale.py

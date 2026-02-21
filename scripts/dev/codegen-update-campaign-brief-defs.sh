#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

source .venv/bin/activate

python3 scripts/codegen/update_campaign_brief_defs.py

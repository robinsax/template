#!/bin/bash
set -o pipefail
set -o errexit
set -o nounset

export PYTHONPATH=./backend

python scripts/codegen/update_app_defs.py
python scripts/codegen/collect_en_locale.py

if [ -n "$(git status --porcelain)" ]; then
    echo "Codegen modified files, run Codegen: All and commit the changes to fix."
    echo "These files were modified:"
    git status --porcelain
    exit 1
fi

#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

if [ ! -d ".venv" ]; then
    python3.11 -m venv .venv

    # Make venv activates not be a hard crash on Windows so we can work around it.
    if [ ! -f ".venv/bin/activate" ]; then
        mkdir -p .venv/bin
        touch .venv/bin/activate
    fi
fi

source .venv/bin/activate

pip install -r requirements.txt

pushd backend
pip install -r requirements.txt
popd

pushd app
npm install --save-dev
popd

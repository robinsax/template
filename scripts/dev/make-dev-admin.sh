#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

source .venv/bin/activate

pushd backend

python backend user create --name admin --email admin@admin.com --password admin
python backend user role assign --email admin@admin.com --role admin

popd

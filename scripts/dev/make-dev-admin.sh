#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

source .venv/bin/activate

pushd backend

python kedet user create --name admin --email admin@admin.com --password admin --owner true
python kedet user role assign --email admin@admin.com --role admin

popd

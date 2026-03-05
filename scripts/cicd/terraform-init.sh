#!/bin/bash
set -o pipefail
set -o errexit
set -o nounset

. ./scripts/common.sh

env_name=$1

pushd infra/gcp

# Init.
terraform init \
    -var-file=./envs/$env_name.tfvars \
    -backend-config="bucket=$project_name-$env_name-terraform"

popd

#!/bin/bash
set -o pipefail
set -o errexit
set -o nounset

env_name=$1

pushd infra/gcp

# Init.
terraform init \
    -var-file=./envs/$env_name.tfvars \
    -backend-config="bucket=kedet-$env_name-terraform"

popd

#!/bin/bash
set -o pipefail
set -o errexit
set -o nounset

env_name=$1

pushd infra/gcp

terraform plan \
    -var-file=./envs/$env_name.tfvars

popd

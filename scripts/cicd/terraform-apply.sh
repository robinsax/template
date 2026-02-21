#!/bin/bash
set -o pipefail
set -o errexit
set -o nounset

. ./scripts/common.sh

env_name=$1

region=$(read_tfvar_value $env_name region)

pushd infra/gcp

gcloud auth configure-docker $region-docker.pkg.dev --quiet

terraform apply \
    -var="use_container_repo_build_cache=true" \
    -var-file=./envs/$env_name.tfvars \
    -auto-approve

popd

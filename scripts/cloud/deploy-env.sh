#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

. ./scripts/common.sh

env_name=$1

# Get project ID.
project_id="$(read_tfvar_value $env_name project_id)"
# Compute service account email.
sa_email="kedet-deployer-$env_name@$project_id.iam.gserviceaccount.com"
# Decide key path.
key_path="$(pwd)/infra/gcp/$env_name.deployer.json"

# Create service account key if it doesn't exist.
if [[ ! -f $key_path ]]; then
    gcloud iam service-accounts keys create $key_path \
        --iam-account $sa_email
fi

gcloud auth activate-service-account $sa_email \
    --key-file $key_path

export GOOGLE_APPLICATION_CREDENTIALS="$key_path"

# Run Terraform.
pushd infra/gcp

var_file="./envs/$env_name.tfvars"

terraform init \
    -reconfigure \
    -var-file=$var_file \
    -backend-config="bucket=kedet-$env_name-terraform"

terraform apply \
    -var-file=$var_file

popd

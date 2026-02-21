#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

. ./scripts/common.sh

env_name=$1
job_name=$2

region=$(read_tfvar_value $env_name "region")

gcloud run jobs execute kedet-$env_name-$job_name \
    --region $region \
    --wait

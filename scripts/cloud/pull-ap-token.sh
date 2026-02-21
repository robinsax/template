#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

. ./scripts/common.sh

env_name=$1

region=$(read_tfvar_value $env_name "region")
project_id=$(read_tfvar_value $env_name "project_id")
job_name="kedet-$env_name-run-cli-job"

read -p "Client ID: " client_id
read -p "Business ID (can leave blank): " business_id
read -p "Platform Key: " platform_key

cmd="python3 -m kedet ap token -cid $client_id -k $platform_key"
if [[ $business_id != "" ]]; then
    cmd="$cmd -bid $business_id"
fi

echo "Invoking: $cmd"

gcloud run jobs execute $job_name \
    --region $region \
    --args "-c","$cmd" \
    --wait

echo "Output here: https://console.cloud.google.com/run/jobs/details/$region/$job_name/executions?project=$project_id"

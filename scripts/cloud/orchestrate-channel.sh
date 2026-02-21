#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

. ./scripts/common.sh

env_name=$1

region=$(read_tfvar_value $env_name "region")
project_id=$(read_tfvar_value $env_name "project_id")
job_name="kedet-$env_name-run-cli-orchestration-job"

read -p "Action: " action
read -p "Channel ID: " channel_id

cmd="python3 -m kedet ap call --action $action -cid $channel_id"
echo "Invoking: $cmd"

gcloud run jobs execute $job_name \
    --region $region \
    --args "-c","$cmd" \
    --wait

echo "Output here: https://console.cloud.google.com/run/jobs/details/$region/$job_name/executions?project=$project_id"

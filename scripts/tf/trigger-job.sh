#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

job_name=$1
region=$2

gcloud run jobs execute $job_name \
    --region $region \
    --wait \
    --format="value(status.startTime,status.completionTime)"

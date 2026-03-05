#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

. ./scripts/common.sh
. ./scripts/gcp.sh

# Setup.
root=$(pwd)
if [[ "${OS:-}" == "Windows_NT" ]]; then
    root=$(cygpath -w $root)
fi

if [[ -f .env ]]; then
    source .env
fi

echo '# Task "Workspace: Configure Local Integrations" manages this file.' > .env

# Maps.
echo "Google Maps API."
echo "  - Go to: https://console.cloud.google.com/google/maps-apis/credentials."
echo "  - Create an API key or use an existing development key."

setup_env_var "GOOGLE_MAPS_API_KEY" .env

# Google Bucket.
use_gcp_storage=$(ask_y_n "Integrate Google Cloud Storage? Local FS used otherwise.")
if [[ $use_gcp_storage == "true" ]]; then
    echo "Google Cloud Storage Bucket."
    echo "  - This requires the gcloud CLI and a GCP project."

    echo "STORAGE_BACKEND=google" >> .env

    project_id=$(get_env_var "GCP_PROJECT_ID")

    res_prefix="$project_name-local"
    use_default_res_prefix=$(ask_y_n "Use $res_prefix resources?")
    if [[ $use_default_res_prefix == "true" ]]; then
        res_prefix="$project_name-local"
    else
        read -p "Resource prefix: " res_prefix
    fi
    
    sa_name="$res_prefix-sa"
    sa_desc="Local Dev Integration"
    key_file="common/gcp-sa.json"

    sa_email=$(create_gcp_service_account $project_id $sa_name "$sa_desc")

    create_gcp_bucket $project_id "$res_prefix-platform-data"
    create_gcp_bucket $project_id "$res_prefix-creative-data"

    grant_gcp_bucket_sa_role "gs://$res_prefix-platform-data" $sa_email roles/storage.admin
    grant_gcp_bucket_sa_role "gs://$res_prefix-creative-data" $sa_email roles/storage.admin

    if [[ ! -f $key_file ]]; then
        gcloud iam service-accounts keys create $key_file \
            --iam-account=$sa_email \
            --project=$project_id
    fi

    echo "GOOGLE_BUCKET_PLATFORM=$res_prefix-platform-data" >> .env
    echo "GOOGLE_BUCKET_CREATIVE=$res_prefix-creative-data" >> .env
    echo "GOOGLE_APPLICATION_CREDENTIALS=$root/$key_file" >> .env
else
    echo "STORAGE_BACKEND=fs" >> .env
    echo "FS_STORAGE_ROOT=$root/.storage" >> .env
fi

# Gemini.
use_gemini=$(ask_y_n "Integrate Gemini? Required for GenAI features.")
if [[ $use_gemini == "true" ]]; then
    echo "Gemini API."
    echo "  - Go to: https://aistudio.google.com/app/apikey"
    echo "  - Create an API key."

    echo "AI_PROVIDER=gemini" >> .env

    setup_env_var "GEMINI_DEV_API_KEY" .env
fi

# SMTP.
use_smtp=$(ask_y_n "Integrate SMTP mail backend? Stdout fallback used otherwise.")
if [[ $use_smtp == "true" ]]; then
    echo "SMTP mail backend."
    echo "  - Configure any SMTP backend."
    echo "  - https://app.mailersend.com is free for development but can only send email to the account admin."

    echo "MAILER=smtp" >> .env

    setup_env_var "SMTP_HOST" .env
    setup_env_var "SMTP_PORT" .env
    setup_env_var "SMTP_USER" .env
    setup_env_var "SMTP_PASSWORD" .env
else
    echo "MAILER=dummy" >> .env
fi

echo "Done. If your local deployment is running, restart it."

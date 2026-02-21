#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

. ./scripts/common.sh
. ./scripts/gcp.sh

sa_roles=(
  "roles/bigquery.admin"
  "roles/run.admin"
  "roles/editor"
  "roles/resourcemanager.projectIamAdmin"
  "roles/secretmanager.admin"
  "roles/iam.serviceAccountAdmin"
  "roles/artifactregistry.admin"
  "roles/compute.networkAdmin"
  "roles/compute.admin"
  "roles/servicenetworking.networksAdmin"
  "roles/aiplatform.admin"
  "roles/logging.admin"
)

env_name=$1

# Read project ID from tfvars if it exists or prompt for it.
project_id=$(read_tfvar_value $env_name project_id)
if [[ $project_id == "" ]]; then
    read -p "Project ID: " project_id
fi

if [[ $project_id == "" || $env_name == "" ]]; then
    echo "Project ID and environment name are required."
    exit 1
fi

# Set up SA and state bucket.
sa_name="kedet-deployer-$env_name"
sa_desc="Kedet Deployer - $env_name"

echo "Creating deployer service account $sa_name..."
sa_email=$(create_gcp_service_account $project_id $sa_name "$sa_desc")

echo "Creating Terraform state bucket..."
create_gcp_bucket $project_id "kedet-$env_name-terraform"

echo "Granting deployer service account access to Terraform bucket..."
grant_gcp_bucket_sa_role "gs://kedet-$env_name-terraform" $sa_email roles/storage.admin

echo "Assigning roles to deployer service account..."
# Idempotent apply.
for role in "${sa_roles[@]}"; do
    echo "$role..."

    set +e
    output=$(
        gcloud projects add-iam-policy-binding $project_id \
            --member="serviceAccount:$sa_email" \
            --role="$role" 2>&1
    )
    exit_code=$?
    set -e

    if [[ $exit_code -ne 0 ]]; then
        echo "Failed to assign $role to $sa_email: $output"
    fi
done

# Set up Terraform variables.
tfvars_file="infra/gcp/envs/$env_name.tfvars"
if [[ ! -f $tfvars_file ]]; then
    echo "Setting up Terraform variables file..."
    smtp_config=$(read_tfvar_value $env_name smtp_config "true")

    echo "project_id = \"$project_id\"" >> $tfvars_file
    echo "env_name = \"$env_name\"" >> $tfvars_file
    echo "name_prefix = \"kedet\"" >> $tfvars_file

    read -p "Region: " region
    echo "region = \"$region\"" >> $tfvars_file

    read -p "Domain name: " domain_name
    echo "domain_name = \"$domain_name\"" >> $tfvars_file
else
    echo "Terraform variables file already exists. Skipping..."
fi

# Set up secrets.
echo "Setting up secrets..."

secrets_index="$(cat infra/gcp/secrets-index.json)"
secrets_index="${secrets_index//[\{\}]/}"
secrets_index="${secrets_index//\"/}"

while read -r secret_info; do
    if [[ $secret_info =~ ^[[:space:]]*$ ]]; then
        continue
    fi

    IFS=': ' read -r key desc <<< "$secret_info"
    secret_name=kedet-$env_name-$key

    if [[ ${#desc} -gt 0 ]]; then
        # Remove trailing comma if present
        desc="${desc%,}"
        echo "$desc"
    fi

    exists=$(check_gcp_secret_exists $project_id $secret_name)
    if [[ $exists == "true" ]]; then
        skip=$(ask_y_n "Secret $secret_name already exists. Leave as-is?")
        if [[ $skip == "true" ]]; then
            continue
        fi
    fi

    read -p "$secret_name: " value < /dev/tty
    if [[ $value == "" ]]; then
        echo "Secret $secret_name left empty."
        create_empty=$(ask_y_n "Create empty?")
        if [[ $create_empty == "true" ]]; then
            set_gcp_secret_value $project_id $secret_name ""
        fi

        continue
    fi

    set_gcp_secret_value $project_id $secret_name "$value"
done <<< "$secrets_index"

echo "Done."

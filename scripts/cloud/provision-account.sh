#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

. ./scripts/common.sh

env_name=$1

region=$(read_tfvar_value $env_name "region")
job_name="$project_name-$env_name-run-cli-job"

# Ask if creating or updating.
echo "=== User ==="
read -p "Create new user or update existing? (create/update): " action

if [[ $action == "create" ]]; then
    # Create user flow.
    read -p "Name: " name
    read -p "Email: " email
    read -p "Password: " password
    read -p "Owner (y/n): " owner

    cmd="python3 -m backend user create --email $email --name \"$name\" --password $password"
    if [[ $owner == "y" ]]; then
        cmd="$cmd --owner"
    fi

    echo "Invoking: $cmd"

    gcloud run jobs execute $job_name \
        --region $region \
        --args "-c","$cmd" \
        --wait
elif [[ $action == "update" ]]; then
    # Update user flow.
    read -p "Email: " email
    read -p "New name (leave blank to skip): " name
    read -p "New password (leave blank to skip): " password

    cmd="python3 -m backend user update --email $email"
    if [[ $name != "" ]]; then
        cmd="$cmd --name \"$name\""
    fi
    if [[ $password != "" ]]; then
        cmd="$cmd --password $password"
    fi

    echo "Invoking: $cmd"

    gcloud run jobs execute $job_name \
        --region $region \
        --args "-c","$cmd" \
        --wait
else
    echo "Invalid action: $action. Must be 'create' or 'update'."
    exit 1
fi

# Assign initial role.
echo "=== Initial role assignment ==="
read -p "Realm ID (leave blank for global): " realm_id
read -p "Role: " role

cmd="python3 -m backend user role assign --email $email --role $role"
if [[ $realm_id != "" ]]; then
    cmd="$cmd --realm $realm_id"
fi

echo "Invoking: $cmd"

gcloud run jobs execute $job_name \
    --region $region \
    --args "-c","$cmd" \
    --wait

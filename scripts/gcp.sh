#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

check_gcp_secret_exists() {
    local project_id=$1
    local secret_name=$2

    set +e
    gcloud secrets describe $secret_name \
        --project=$project_id &> /dev/null
    exit_code=$?
    set -e

    if [[ $exit_code -ne 0 ]]; then
        echo "false"
    else
        echo "true"
    fi
}

set_gcp_secret_value() {
    local project_id=$1
    local secret_name=$2
    local secret_value=$3

    secret_exists=$(check_gcp_secret_exists $project_id $secret_name)
    if [[ $secret_exists != "true" ]]; then
        gcloud secrets create $secret_name \
            --project=$project_id \
            --replication-policy=automatic
    fi

    echo "$secret_value" | gcloud secrets versions add $secret_name \
        --project=$project_id \
        --data-file=-
}

create_gcp_service_account() {
    local project_id=$1
    local sa_name=$2
    local sa_desc=$3

    sa_email="$sa_name@$project_id.iam.gserviceaccount.com"

    sa_exists=$(
        gcloud iam service-accounts list \
            --project=$project_id \
            --format="value(email)" | \
        grep -qx $sa_email && echo yes || echo no
    )
    if [[ $sa_exists == "no" ]]; then
        gcloud iam service-accounts create $sa_name \
            --display-name="$sa_desc" \
            --project=$project_id
    fi

    echo $sa_email
}

grant_gcp_bucket_sa_role() {
    local bucket=$1
    local sa_email=$2
    local role=$3

    local role_granted=$(
        gcloud storage buckets get-iam-policy $bucket \
            --flatten="bindings[].members" \
            --format="value(bindings.role,bindings.members)" | \
        grep -q "$role.*serviceAccount:${sa_email}" && echo yes || echo no
    )
    if [[ $role_granted == "no" ]]; then
        gcloud storage buckets add-iam-policy-binding $bucket \
            --member="serviceAccount:${sa_email}" \
            --role=$role
    fi
}

create_gcp_bucket() {
    local project_id=$1
    local bucket_name=$2

    local bucket_exists=$(
        gcloud storage buckets list --project=$project_id \
            --format="value(name)" | \
        grep -qx $bucket_name && echo yes || echo no
    )
    if [[ $bucket_exists == "no" ]]; then
        gcloud storage buckets create gs://$bucket_name \
            --project=$project_id \
            --location=US \
            --default-storage-class=STANDARD
    fi
}

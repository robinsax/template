#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

ask_y_n() {
    local message=$1

    read -p "$message [y/n]: " response < /dev/tty
    if [[ $response == "y" ]]; then
        echo "true"
    else
        echo "false"
    fi
}

get_env_var() {
    local key=$1

    if [[ ! -z "${!key-}" ]]; then
        use_existing=$(ask_y_n "$key is already set. Use existing value?")
        if [[ $use_existing == "true" ]]; then
            echo "${!key-}"
            return
        fi
    fi

    read -p "$key: " value < /dev/tty
    echo "$value"
}

setup_env_var() {
    local key=$1
    local dest=$2

    local value=$(get_env_var "$key")

    echo "$key=$value" >> "$dest"
}

read_tfvar_value() {
    local env_name=$1
    local key=$2
    local full_line="false"
    if [[ ! -z "${3+x}" ]]; then
        full_line=$3
    fi

    local tfvars_file="infra/gcp/envs/$env_name.tfvars"

    if [[ ! -f $tfvars_file ]]; then
        echo ""
        exit 0
    fi

    existing_value=$(
        cat $tfvars_file |
        grep "^$key"
    )

    if [[ $full_line != "true" ]]; then
        existing_value=$(echo "$existing_value" | cut -d '=' -f2 | tr -d ' "')
    fi

    echo "$existing_value"
}

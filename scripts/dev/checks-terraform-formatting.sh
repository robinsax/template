#!/bin/bash
set -o pipefail
set -o errexit
set -o nounset

cd infra/gcp

set +e
output=$(terraform fmt -check -recursive)
exit_code=$?
set -e

if [ $exit_code -ne 0 ]; then
    echo "Terraform formatting check failed. Run task \"Workspace: Format Terraform\"."
    echo "These files are unformatted:"
    echo "$output"
    exit 1
fi

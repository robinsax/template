#!/bin/bash
set -o pipefail
set -o errexit
set -o nounset

pushd infra/gcp

terraform fmt -recursive

popd

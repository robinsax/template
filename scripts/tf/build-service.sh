#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

region=$1
service_name=$2
build_dir=$3
repo_name=$4
use_cache=$5

cd_mode="${CI:-false}"

if [[ -d $build_dir/common ]]; then
    rm -rf $build_dir/common
fi
cp -rf common $build_dir/

pushd $build_dir

gcloud auth configure-docker $region-docker.pkg.dev --quiet

cache_args=()
if [[ "$use_cache" = "true" ]]; then
    cache_args+=("--cache-from")
    cache_args+=("type=registry,ref=$repo_name/$service_name:cache")
    cache_args+=("--cache-to")
    cache_args+=("type=registry,ref=$repo_name/$service_name:cache,mode=max")
fi

image_name="$repo_name/$service_name:latest"

if [[ "$cd_mode" == "true" ]]; then
    # Use Buildx in CD to support caching.
    docker buildx build \
        -t "$image_name" \
        --target "$service_name" \
        --push \
        "${cache_args[@]}" \
        .
else
    # Local already uses BuildKit.
    docker build \
        -t "$image_name" \
        --target "$service_name" \
        "${cache_args[@]}" \
        .

    docker push "$image_name"
fi

popd

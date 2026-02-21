#!/bin/sh
set -o errexit

echo "Booting API on :$SERVICE_PORT..."

hypercorn kedet.api:app --bind 0.0.0.0:$SERVICE_PORT

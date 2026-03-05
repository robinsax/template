#!/bin/sh
set -o errexit

echo "Booting tasks on :$SERVICE_PORT..."

hypercorn backend.tasks:app --bind 0.0.0.0:$SERVICE_PORT

#!/bin/sh
set -o errexit

echo "Booting tasks on :$SERVICE_PORT..."

hypercorn kedet.tasks:app --bind 0.0.0.0:$SERVICE_PORT

#!/bin/sh
set -o errexit

echo "Booting streams on :$SERVICE_PORT..."

hypercorn kedet.streams:app --bind 0.0.0.0:$SERVICE_PORT

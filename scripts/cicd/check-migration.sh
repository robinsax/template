#!/bin/bash
set -o errexit
set -o pipefail
set -o nounset

pushd backend

export POSTGRES_URI="postgresql+psycopg2://ci:ci@localhost:5432/migration_check"

python -m alembic upgrade head

python -m alembic revision --autogenerate -m "CI check" --rev-id ci_check || true

rev_file=$(find migrations/versions -name "*ci_check*.py")

if grep -q "op." "$rev_file"; then
    echo "Uncommitted database model changes present."
    echo "This migration was emitted:"
    cat "$rev_file"
    exit 1
fi

popd

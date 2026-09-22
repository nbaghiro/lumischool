#!/usr/bin/env bash
# Rebuilds only the local container database, without adding application data.
set -euo pipefail
cd "$(dirname "$0")/../.." || exit 1

export DATABASE_URL=postgres://lumischool:lumischool@localhost:8502/lumischool
export APP_DATABASE_URL=postgres://lumischool_app:lumischool_app@localhost:8502/lumischool

bash tools/scripts/db-up.sh

echo "dropping the schema in local lumischool"
docker exec -i lumischool-pg psql -q -v ON_ERROR_STOP=1 -U lumischool -d lumischool \
    -c 'set client_min_messages = warning' \
    -c 'drop schema if exists public cascade' \
    -c 'create schema public' \
    -c 'drop schema if exists drizzle cascade'

npm run --silent db:migrate
echo "local database ready; sign up in the app to create a family"

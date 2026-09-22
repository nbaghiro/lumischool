#!/usr/bin/env bash
# Throws away every row in the local development database and builds it again from the migrations
# and the seed. This is the command to reach for when a migration went wrong, when the seed changed,
# or when the data got into a state nobody wants to reason about.
#
# It only ever touches this project's own container (lumischool-pg) and its own database
# (lumischool). It does not remove the named volume and it runs no docker command that could reach
# another project's container, which matters on a machine that has several of them running.
#
# What it does not do is touch the tests' databases, lumischool_test_<pid>, which the integration tests own and build for
# themselves.
set -euo pipefail
cd "$(dirname "$0")/../.." || exit 1

bash tools/scripts/db-up.sh

echo "dropping the schema in lumischool"
docker exec -i lumischool-pg psql -q -U lumischool -d lumischool \
    -c 'set client_min_messages = warning' \
    -c 'drop schema if exists public cascade' \
    -c 'create schema public' \
    -c 'drop schema if exists drizzle cascade'

npm run --silent db:migrate
npm run --silent db:seed

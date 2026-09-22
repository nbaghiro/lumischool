#!/usr/bin/env bash
# Brings the local Postgres up and waits for it to be ready.
#
# It waits rather than returning straight away, and it exits non-zero when the container does not
# come up, because a person who typed `npm run db:up` wants to know. Idempotent: running it against
# an already-running container is a no-op that confirms readiness.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1

docker compose up -d postgres || {
    echo "docker compose could not start postgres. Is Docker running?" >&2
    exit 1
}

for _ in $(seq 1 60); do
    if docker exec lumischool-pg pg_isready -q -U lumischool -d lumischool >/dev/null 2>&1; then
        # The app role's local login. Idempotent, and needed for a volume created before the file
        # existed, since the container only runs its init scripts when the volume is new.
        docker exec -i lumischool-pg psql -q -v ON_ERROR_STOP=1 -U lumischool -d lumischool \
            < server/db/migrations/local-roles.sql >/dev/null || {
            echo "could not give the app role its local login" >&2
            exit 1
        }
        echo "postgres ready on localhost:8502"
        exit 0
    fi
    sleep 0.5
done

echo "postgres did not become ready within 30s. Try: docker compose logs postgres" >&2
exit 1

#!/bin/bash
set -euo pipefail

pnpm install --frozen-lockfile

# Drizzle can prompt (and wait indefinitely) even when a constraint already
# exists. Most merges do not change the schema, so do not run a redundant push.
if git rev-parse --verify HEAD^ >/dev/null 2>&1 &&
   git diff --quiet HEAD^ HEAD -- lib/db/src/schema; then
  echo "No database schema changes in this merge; skipping schema push."
  exit 0
fi

# A schema change should never silently truncate existing data. Drizzle may
# return success after an unanswered prompt, so check its output as well.
push_log=$(mktemp)
trap 'rm -f "$push_log"' EXIT
set +e
timeout 90s pnpm --filter @workspace/db push </dev/null 2>&1 | tee "$push_log"
push_status=${PIPESTATUS[0]}
set -e
if grep -Eq 'Do you want to truncate|❯' "$push_log"; then
  echo "Schema push needs manual review; no destructive choice was made." >&2
  exit 1
fi
exit "$push_status"

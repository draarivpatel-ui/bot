#!/bin/sh
# The tests run the real jobs board in memory, so they need its source. Fetch it into .jobs/ (gitignored).
#   sh scripts/fetch-jobs.sh          uses the pinned commit below
#   JOBS_REF=main sh scripts/fetch-jobs.sh
set -eu
JOBS_REF="${JOBS_REF:-190661066948ce30149ec158d1472a6591e7d459}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$ROOT/.jobs"
git clone --quiet https://github.com/flisk-sh/jobs.git "$ROOT/.jobs"
git -C "$ROOT/.jobs" checkout --quiet "$JOBS_REF"

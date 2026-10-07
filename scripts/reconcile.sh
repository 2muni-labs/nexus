#!/usr/bin/env bash
# Recover a workflow decision from freshly collected external observations only.
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
if [[ ${1:-} == --help ]]; then
    printf 'Usage: scripts/reconcile.sh EXTERNAL-SNAPSHOT.json\nRead-only recovery proposal; no runtime cache, automatic dispatch or writes.\n'
    exit 0
fi
[[ $# -eq 1 && -f "$1" && -r "$1" ]] || nexus_fail 'Readable external snapshot JSON required.'
command -v jq >/dev/null 2>&1 || nexus_fail 'jq required for reconciliation.'
jq -e -L "$(dirname -- "${BASH_SOURCE[0]}")" --slurpfile policy "$(dirname -- "${BASH_SOURCE[0]}")/../config/workflow.json" \
    -f "$(dirname -- "${BASH_SOURCE[0]}")/reconcile.jq" "$1"

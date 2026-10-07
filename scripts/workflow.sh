#!/usr/bin/env bash
# Pure one-shot policy evaluation. Reads JSON, proposes a decision, writes no state.
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
if [[ ${1:-} == --help ]]; then
    printf 'Usage: scripts/workflow.sh OBSERVATION.json\nRead-only decision proposal; no provider/backend calls or automatic transitions.\n'
    exit 0
fi
[[ $# -eq 1 && -f "$1" && -r "$1" ]] || nexus_fail 'Readable observation JSON required.'
command -v jq >/dev/null 2>&1 || nexus_fail 'jq required for workflow observations.'
jq -e -L "$(dirname -- "${BASH_SOURCE[0]}")" --slurpfile policy "$(dirname -- "${BASH_SOURCE[0]}")/../config/workflow.json" \
    -f "$(dirname -- "${BASH_SOURCE[0]}")/workflow.jq" "$1"

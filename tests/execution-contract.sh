#!/usr/bin/env bash
set -euo pipefail
nexus_test_root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
source "$nexus_test_root/scripts/common.sh"
command -v jq >/dev/null 2>&1 || nexus_fail 'jq required for JSON fixture tests.'
nexus_test_tmp=$(mktemp -d "${TMPDIR:-/tmp}/nexus-execution.XXXXXX")
trap 'rm -f -- "$nexus_test_tmp/receipt.json"; rmdir -- "$nexus_test_tmp"' EXIT
check() {
    local name=$1 fixture=$2 state=$3 live=$4 result
    printf '%s\n' "$fixture" > "$nexus_test_tmp/receipt.json"
    result=$(nexus_backend_observation exec-1 attempt-1 2026-10-07T00:00:00Z "$nexus_test_tmp/receipt.json")
    jq -e --arg state "$state" --arg live "$live" '
      .execution_id == "exec-1" and .state == $state and .liveness == $live
      and .external_receipt.backend == "orca"' <<< "$result" >/dev/null
    printf 'PASS: %s\n' "$name"
}
check start-is-not-completion '{"ok":true,"result":{"dispatchId":"attempt-1","state":"ready"}}' unknown unknown
check live-no-result '{"ok":true,"result":{"projection":{"dispatchId":"attempt-1","liveness":{"verdict":"live"}}}}' running live
check durable-success '{"ok":true,"result":{"projection":{"dispatchId":"attempt-1","stage":{"dispatch":"completed"},"outcome":"succeeded","evidence":{"durable":true},"liveness":{"verdict":"exited"}}}}' succeeded exited
check durable-failure '{"ok":true,"result":{"projection":{"dispatchId":"attempt-1","stage":{"dispatch":"completed"},"outcome":"failed","evidence":{"durable":true},"liveness":{"verdict":"exited"}}}}' failed exited
check exit-is-not-success '{"ok":true,"result":{"projection":{"dispatchId":"attempt-1","liveness":{"verdict":"exited"}}}}' unknown exited
check no-durable-result '{"ok":true,"result":{"projection":{"dispatchId":"attempt-1","stage":{"dispatch":"completed"},"outcome":"succeeded"}}}' unknown unknown
check stale-attempt '{"ok":true,"result":{"projection":{"dispatchId":"other","stage":{"dispatch":"completed"},"outcome":"succeeded","evidence":{"durable":true},"liveness":{"verdict":"exited"}}}}' unknown unknown
check contact-loss '{"ok":true,"result":{"projection":{"dispatchId":"attempt-1","liveness":{"verdict":"unverifiable"}}}}' unknown unknown
check unknown-version '{"ok":true,"result":{"projection":{"dispatchId":"attempt-1","stage":{"dispatch":"new-state"},"outcome":"new-outcome"}}}' unknown unknown
check rejected-observation '{"ok":false,"result":{"projection":{"dispatchId":"attempt-1","liveness":{"verdict":"live"}}}}' unknown unknown
# An unsupported backend must never silently invoke Orca.
if (NEXUS_EXECUTION_BACKEND=unsupported nexus_backend_preflight) 2>/dev/null; then exit 1; fi
printf 'PASS: unsupported backend refuses fallback\n'

#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
nexus_root
local_cwd=$(git rev-parse --show-toplevel 2>/dev/null) || nexus_fail 'Run doctor from within the Nexus checkout.'
local_cwd=$(CDPATH= cd -- "$local_cwd" && pwd -P)
[[ "$local_cwd" == "$NEXUS_ROOT" ]] || nexus_fail 'Current directory belongs to a different Git repository.'
"$NEXUS_ROOT/scripts/validate.sh"
nexus_backend_preflight
nexus_local
nexus_backend_repositories "$@"
printf 'PASS: Git root, selected backend preflight and requested repository identities.\n'
printf 'Backend: %s\nConfiguration: %s\n' "${NEXUS_EXECUTION_BACKEND:-orca}" "$NEXUS_LOCAL_STATE"
if ! git -C "$NEXUS_ROOT" rev-parse --verify HEAD >/dev/null 2>&1; then
    nexus_warn 'No initial commit: isolated Nexus workers need a human-approved base commit.'
fi

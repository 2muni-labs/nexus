#!/usr/bin/env bash
# Explicit one-shot Project read/update. No automatic synchronization or project creation.
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
if [[ ${1:-} == --help ]]; then
    cat <<'USAGE'
Usage: scripts/projects.sh read LOGICAL-REPOSITORY
       scripts/projects.sh field-update LOGICAL-REPOSITORY REQUEST.json
Default config: local/github.json (override NEXUS_GITHUB_CONFIG with literal JSON path).
Update request: issue_url, field (status|priority), expected_value, value.
Default outputs a write plan. Apply: --apply --approved-plan OID --approval-reference REF.
Each logical repository has its own linked Project; no create/merge/push/delete operation.
USAGE
    exit 0
fi
[[ $# -ge 2 ]] || nexus_fail 'Operation and logical repository required.'
operation=$1; logical=$2; shift 2
argument=''; apply=false; approved=''; approval=''
if [[ $# -gt 0 && "$1" != --* ]]; then argument=$1; shift; fi
while [[ $# -gt 0 ]]; do
    case "$1" in
        --apply) [[ "$apply" == false ]] || nexus_fail 'Duplicate --apply.'; apply=true; shift ;;
        --approved-plan|--approval-reference)
            [[ $# -ge 2 && -n "$2" ]] || nexus_fail 'Missing approval argument.'
            case "$1" in --approved-plan) [[ -z "$approved" ]] || nexus_fail 'Duplicate plan.'; approved=$2 ;;
              *) [[ -z "$approval" ]] || nexus_fail 'Duplicate reference.'; approval=$2 ;; esac
            shift 2 ;;
        *) nexus_fail "Unknown argument: $1" ;;
    esac
done
[[ "${NEXUS_WORK_ITEM_PROVIDER:-github}" == github ]] || nexus_fail 'Unsupported provider; no fallback.'
command -v jq >/dev/null 2>&1 || nexus_fail 'jq required for Project JSON.'
nexus_root
NEXUS_REPOSITORIES=$(nexus_repository_keys)
nexus_repository_known "$logical" || nexus_fail 'Unknown owning repository.'
config=${NEXUS_GITHUB_CONFIG:-"$NEXUS_ROOT/local/github.json"}
[[ -f "$config" && -r "$config" ]] || nexus_fail 'Configure local/github.json; see its example.'
source "$(dirname -- "${BASH_SOURCE[0]}")/adapters/github.sh"
source "$(dirname -- "${BASH_SOURCE[0]}")/adapters/github-projects.sh"
nexus_github_project_operation "$operation" "$logical" "$config" "$argument" "$apply" "$approved" "$approval"

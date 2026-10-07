#!/usr/bin/env bash
# One explicit provider operation; read-only or a prepared write plan by default.
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
if [[ ${1:-} == --help ]]; then
    cat <<'USAGE'
Usage: scripts/work-items.sh OP OWNER/REPO [NUMBER|REQUEST.json]
Reads: issue-read, issue-list, pr-read, pr-list, review-checks-read
Writes: issue-create, issue-update, pr-create, association-comment
Write requests are JSON; default prints exact plan + plan_oid, performs no writes.
Apply: append --apply --approved-plan OID --approval-reference TEXT.
Only GitHub is supported. No merge/push/delete, automatic retries or local state store.
USAGE
    exit 0
fi
[[ $# -ge 2 ]] || nexus_fail 'Operation and OWNER/REPO required; see --help.'
operation=$1; repository=$2; shift 2
argument=''; apply=false; approved=''; approval=''
if [[ $# -gt 0 && "$1" != --* ]]; then argument=$1; shift; fi
while [[ $# -gt 0 ]]; do
    case "$1" in
        --apply) [[ "$apply" == false ]] || nexus_fail 'Duplicate --apply.'; apply=true; shift ;;
        --approved-plan|--approval-reference)
            [[ $# -ge 2 && -n "$2" ]] || nexus_fail 'Missing approval argument.'
            case "$1" in --approved-plan) [[ -z "$approved" ]] || nexus_fail 'Duplicate approval.'; approved=$2 ;;
                *) [[ -z "$approval" ]] || nexus_fail 'Duplicate reference.'; approval=$2 ;; esac
            shift 2 ;;
        *) nexus_fail "Unknown argument: $1" ;;
    esac
done
[[ "${NEXUS_WORK_ITEM_PROVIDER:-github}" == github ]] || nexus_fail 'Unsupported work item provider; no fallback.'
[[ "$repository" =~ ^[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9][A-Za-z0-9_.-]*$ ]] || nexus_fail 'Expected explicit OWNER/REPO.'
command -v jq >/dev/null 2>&1 || nexus_fail 'jq required for JSON work items.'
source "$(dirname -- "${BASH_SOURCE[0]}")/adapters/github.sh"
nexus_github_operation "$operation" "$repository" "$argument" "$apply" "$approved" "$approval"

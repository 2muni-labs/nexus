#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
usage() {
    cat <<'USAGE'
Usage: scripts/run.sh --objective TEXT [--workflow feature-execution|weekly-review]
       [--mode auto|DIRECT|ORCHESTRATED] [--repository LOGICAL-KEY ...] [--plan PATH]
Read-only preflight and Coordinator context. Does not dispatch, execute or approve a plan.
Without --repository, ownership remains unresolved for planning; no managed selector is checked.
USAGE
}
workflow=feature-execution; mode=auto; objective=''; plan=''; repositories=(); seen=' '
while [[ $# -gt 0 ]]; do
    option=$1
    case "$option" in
        --help) usage; exit 0 ;;
        --workflow|--mode|--objective|--plan|--repository)
            [[ $# -ge 2 && -n "$2" && "$2" != --* ]] || nexus_fail "Missing value: $option"
            if [[ "$option" != --repository ]]; then
                [[ "$seen" != *" $option "* ]] || nexus_fail "Duplicate option: $option"
                seen="$seen$option "
            fi
            case "$option" in
                --workflow) workflow=$2 ;; --mode) mode=$2 ;; --objective) objective=$2 ;;
                --plan) plan=$2 ;; --repository) repositories+=("$2") ;;
            esac
            shift 2 ;;
        *) nexus_fail "Unknown option: $option" ;;
    esac
done
case "$workflow" in feature-execution|weekly-review) ;; *) nexus_fail 'Unsupported workflow.' ;; esac
case "$mode" in auto|DIRECT|ORCHESTRATED) ;; *) nexus_fail 'Mode must be auto, DIRECT or ORCHESTRATED.' ;; esac
[[ -n "$objective" && "$objective" == *[![:space:]]* ]] || nexus_fail '--objective is required.'
if [[ -n "$plan" ]]; then
    [[ -f "$plan" && -r "$plan" && -s "$plan" ]] || nexus_fail '--plan must reference a readable, nonempty file.'
    plan="$(CDPATH= cd -- "$(dirname -- "$plan")" && pwd -P)/$(basename -- "$plan")"
fi
nexus_root
"$NEXUS_ROOT/scripts/validate.sh"
nexus_local
for repository in ${repositories[@]+"${repositories[@]}"}; do nexus_repository_known "$repository" || nexus_fail "Unknown logical repository: $repository"; done
nexus_orca
nexus_runtime
nexus_guide
# Current checkout identity is always checked; unrelated managed repositories are optional.
nexus_selectors nexus
for repository in ${repositories[@]+"${repositories[@]}"}; do [[ "$repository" == nexus ]] || nexus_selectors "$repository"; done
printf '\nInstalled Orca orchestration guidance (%s)\n\n%s\n' "$NEXUS_ORCA" "$NEXUS_GUIDE"
printf '\nCoordinator context\nRoot: %s\nWorkflow: %s/workflows/%s.md\nObjective: %s\nRequested mode: %s (Planner must validate eligibility)\nConfiguration: %s\n' "$NEXUS_ROOT" "$NEXUS_ROOT" "$workflow" "$objective" "$mode" "$NEXUS_LOCAL_STATE"
if [[ ${#repositories[@]} -eq 0 ]]; then printf 'Repository ownership: unresolved; determine during intake.\n'; fi
for repository in ${repositories[@]+"${repositories[@]}"}; do printf 'Repository: %s -> %s\n' "$repository" "$(nexus_repo_selector "$repository")"; done
if [[ -n "$plan" ]]; then printf 'Proposed plan: %s (reference only; semantic validation still required)\n' "$plan"; fi
if [[ -e "$NEXUS_ROOT/local/capabilities.yaml" ]]; then
    [[ -f "$NEXUS_ROOT/local/capabilities.yaml" && -r "$NEXUS_ROOT/local/capabilities.yaml" ]] || nexus_fail 'Local capabilities must be readable data.'
    printf 'Local capability mapping: present; Coordinator must verify against execution host.\n'
else
    printf 'Local capability mapping: absent; use verified inherited capabilities or hold tasks with unknown required floors.\n'
fi
cat <<'CONTEXT'
Read AGENTS.md, docs/review-principles.md, all four config policies, schemas/execution-plan.yaml,
prompts/coordinator.md, prompts/planner.md and the requested workflow.
Validate requirements, scope and dirty-state inclusion; create a bounded plan and routing
record under .runtime/runs/<Orca-run-id>/ only when execution is actually requested.
Use installed Orca references before dispatch. Preserve one owner per mutable task,
isolated mutable worktrees, explicit completion, integration PASS and separate validation.
Provider models and effort are local verified choices; preserve capability floors on fallback.
Generated reviews remain ignored. Human merge/push/PR approval remains mandatory.
This command only prepared context: no plan approved, run created, worker started or state written.
CONTEXT

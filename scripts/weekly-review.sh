#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
nexus_root
"$NEXUS_ROOT/scripts/validate.sh"
nexus_orca
nexus_runtime
nexus_guide
nexus_local
nexus_selectors
printf '\nInstalled Orca orchestration guidance (%s)\n\n%s\n' "$NEXUS_ORCA" "$NEXUS_GUIDE"
printf '\nCoordinator execution context\n'
printf 'Root: %s\nWorkflow: %s/workflows/weekly-review.md\n' "$NEXUS_ROOT" "$NEXUS_ROOT"
printf 'Configuration: %s\nNexus: %s\nBasecamp: %s\nFoundry: %s\n' \
    "$NEXUS_LOCAL_STATE" "$NEXUS_REPO_SELECTOR" "$BASECAMP_REPO_SELECTOR" "$FOUNDRY_REPO_SELECTOR"
cat <<'CONTEXT'
Read AGENTS.md, config/repositories.yaml, config/routing.yaml, config/review.yaml,
prompts/coordinator.md and workflows/weekly-review.md before starting.
Objective: review Basecamp/Foundry architecture and producer/consumer contracts.
Use repository reviewer prompts for parallel read-only Wave 1; synthesize normalized
findings; apply P0–P3 gates; dispatch accepted fixes only to their single owner.
One task = one owner = one repository = one isolated worktree = one diff = one review decision.
Read the installed placement reference before dispatch; require isolated workspaces.
Use optional secondary agents only when available, with compatible fallback.
P0/P1 require independent validation in a separate session against the exact diff.
Record normalized results under reviews/<ISO week-year>/W<week>/ using the template.
Human review and merge approval in Orca are mandatory. No automatic merge/push/PR.
This script prepared context only; no workers started and no review performed.
CONTEXT
if ! git -C "$NEXUS_ROOT" rev-parse --verify HEAD >/dev/null 2>&1; then
    nexus_warn 'Nexus has no base commit yet; isolated Nexus review workers require human-approved initialization.'
fi

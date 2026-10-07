#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
nexus_root
nexus_orca
nexus_runtime
nexus_guide
nexus_local
printf 'Nexus: %s\nConfiguration: %s\nOrca executable: %s\n' "$NEXUS_ROOT" "$NEXUS_LOCAL_STATE" "$NEXUS_ORCA"
printf '\nOrca runtime\n'
"$NEXUS_ORCA" status || nexus_fail 'Primary Orca runtime connection failed.'
# Probe optional commands; these views never perform lifecycle mutations.
if "$NEXUS_ORCA" worktree list --help >/dev/null 2>&1; then
    if [[ $# -eq 0 ]]; then
        while IFS= read -r repository; do set -- "$@" "$repository"; done <<< "$NEXUS_REPOSITORIES"
    fi
    for repository in "$@"; do
        selector=$(nexus_repo_selector "$repository")
        printf '\nWorktrees (%s, up to 10; snapshot only)\n' "$selector"
        "$NEXUS_ORCA" worktree list --repo "$selector" --limit 10 || nexus_warn 'Optional worktree view unavailable.'
    done
else
    nexus_warn 'Installed Orca does not support the optional worktree view.'
fi
if "$NEXUS_ORCA" orchestration run-current --help >/dev/null 2>&1 &&
    "$NEXUS_ORCA" orchestration task-list --help >/dev/null 2>&1; then
    printf '\nOrchestration tasks (caller-bound Run)\n'
    if current_run=$("$NEXUS_ORCA" orchestration run-current --json); then
        current_run=$(printf '%s' "$current_run" | tr -d '[:space:]')
        if [[ "$current_run" == *'"run":null'* ]]; then
            printf 'Unavailable: no Run is bound; no Run was created.\n'
        else
            "$NEXUS_ORCA" orchestration task-list --brief || nexus_warn 'Optional task view unavailable.'
        fi
    else
        nexus_warn 'Optional Run context unavailable.'
    fi
fi
if "$NEXUS_ORCA" orchestration worker-list --help >/dev/null 2>&1; then
    printf '\nOrchestration workers (up to 10; Orca reports scope, not an exhaustive audit)\n'
    "$NEXUS_ORCA" orchestration worker-list --limit 10 || nexus_warn 'Optional worker view unavailable.'
fi

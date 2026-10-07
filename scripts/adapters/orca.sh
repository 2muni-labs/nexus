# Orca read-only preflight adapter. Source through scripts/common.sh under strict mode.
# This preserves the v0.2 helper API; it is not an asynchronous execution backend yet.
# Policy/routing and logical project state must never be implemented here.
nexus_orca() {
    if [[ -n "${ORCA_CLI_COMMAND:-}" ]]; then
        NEXUS_ORCA=$ORCA_CLI_COMMAND
    elif [[ -n "${ORCA_DEV_REPO_ROOT:-}" ]]; then
        NEXUS_ORCA=orca-dev
    elif [[ $(uname -s) == Linux ]]; then
        NEXUS_ORCA=orca-ide
    else
        NEXUS_ORCA=orca
    fi
    command -v "$NEXUS_ORCA" >/dev/null 2>&1 || nexus_fail "Selected Orca executable unavailable: $NEXUS_ORCA (no fallback)."
}
nexus_runtime() {
    local reply compact
    reply=$("$NEXUS_ORCA" status --json) || nexus_fail 'Orca status --json failed; start/check Orca manually.'
    compact=$(printf '%s' "$reply" | tr -d '[:space:]')
    # Readiness fields verified against the installed status contract.
    [[ "$compact" == *'"ok":true'* && "$compact" == *'"reachable":true'* ]] ||
        nexus_fail 'Orca did not report a successful, reachable runtime; inspect status --json.'
}
nexus_guide() {
    NEXUS_GUIDE=$("$NEXUS_ORCA" skills get orchestration) || nexus_fail 'Version-matched orchestration guidance unavailable; check/update the selected Orca.'
    [[ -n "$NEXUS_GUIDE" ]] || nexus_fail 'Orca returned empty orchestration guidance.'
}
nexus_selectors() {
    local repository selector selected line selected_path='' root_common selected_common
    if [[ $# -eq 0 ]]; then
        while IFS= read -r repository; do nexus_selectors "$repository"; done <<< "$NEXUS_REPOSITORIES"
        return
    fi
    for repository in "$@"; do
        selector=$(nexus_repo_selector "$repository")
        "$NEXUS_ORCA" repo show --repo "$selector" --json >/dev/null || nexus_fail "Cannot resolve $repository selector; check local/repos.env and Orca repo list."
        [[ "$repository" == nexus ]] || continue
        selected=$("$NEXUS_ORCA" repo show --repo "$selector") || nexus_fail 'Cannot inspect Nexus selector.'
        while IFS= read -r line; do
            case "$line" in 'path: '*) selected_path=${line#path: }; break ;; esac
        done <<< "$selected"
        [[ -n "$selected_path" ]] || nexus_fail 'Cannot inspect Nexus selector path.'
        root_common=$(nexus_git_common_dir "$NEXUS_ROOT") || nexus_fail 'Cannot resolve Nexus checkout Git identity.'
        selected_common=$(nexus_git_common_dir "$selected_path") || nexus_fail 'Cannot resolve Nexus selector Git identity.'
        [[ "$selected_common" == "$root_common" ]] || nexus_fail 'Nexus selector resolves to a different Git repository; check local/repos.env.'
    done
}

# Port implementations. Policy and routing remain outside this adapter.
nexus_adapter_preflight() { nexus_orca; nexus_runtime; nexus_guide; }
nexus_adapter_repositories() { nexus_selectors "$@"; }
nexus_adapter_status() {
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
}

nexus_adapter_context() {
    printf '\nInstalled Orca orchestration guidance (%s)\n\n%s\n' "$NEXUS_ORCA" "$NEXUS_GUIDE"
}
# Normalize an inspected worker-show receipt; no CLI call or lifecycle mutation.
# Caller must preserve provenance and supply the exact expected native attempt identity.
nexus_adapter_observation() {
    [[ $# -eq 4 ]] || nexus_fail 'observation requires logical execution ID, external attempt ID, observed-at and receipt file.'
    command -v jq >/dev/null 2>&1 || nexus_fail 'jq is required for JSON observations.'
    jq -e --arg execution "$1" --arg external "$2" --arg at "$3" '
      . as $raw | (.result.projection // {}) as $p |
      (.ok == true and $p.dispatchId == $external) as $exact |
      (if $exact and ($p.liveness.verdict == "live" or $p.liveness.verdict == "exited")
       then $p.liveness.verdict else "unknown" end) as $live |
      (if $exact and $p.evidence.durable == true and $p.stage.dispatch == "completed"
          and ($p.outcome == "succeeded" or $p.outcome == "failed") then $p.outcome
       elif $exact and $live == "live" then "running"
       else "unknown" end) as $state |
      {execution_id:$execution, state:$state, liveness:$live,
       observed_at:$at, evidence:{source:"backend-observation", identity_verified:$exact,
         durable_outcome:($state == "succeeded" or $state == "failed")},
       external_receipt:{backend:"orca", external_execution_id:$external,
         metadata:{run_id:$p.runId, task_id:$p.taskId,
           resource_state:$p.resource.state, next_action:$p.nextAction,
           liveness_source:$p.liveness.source}}}
    ' "$4"
}

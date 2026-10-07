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

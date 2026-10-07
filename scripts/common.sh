# Shared read-only helpers; source after enabling strict mode.
nexus_fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
nexus_warn() { printf 'WARN: %s\n' "$*" >&2; }
nexus_root() {
    NEXUS_ROOT=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
    command -v git >/dev/null 2>&1 || nexus_fail 'git is required.'
    local actual
    actual=$(git -C "$NEXUS_ROOT" rev-parse --show-toplevel 2>/dev/null) || nexus_fail 'Nexus must be a Git checkout.'
    actual=$(CDPATH= cd -- "$actual" && pwd -P)
    [[ "$actual" == "$NEXUS_ROOT" ]] || nexus_fail 'Script root is not the Nexus Git root.'
}
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
nexus_local() {
    NEXUS_REPO_SELECTOR=name:nexus
    BASECAMP_REPO_SELECTOR=name:basecamp
    FOUNDRY_REPO_SELECTOR=name:foundry
    NEXUS_LOCAL_STATE='defaults (local/repos.env absent)'
    local line key value seen=' ' pattern
    pattern='^([A-Z_]+)="([^"$`\\]+)"$'
    if [[ -e "$NEXUS_ROOT/local/repos.env" ]]; then
        [[ -f "$NEXUS_ROOT/local/repos.env" && -r "$NEXUS_ROOT/local/repos.env" ]] || nexus_fail 'local/repos.env must be a readable regular file.'
        # Literal data only: sourcing an env file would execute shell code.
        while IFS= read -r line || [[ -n "$line" ]]; do
            [[ "$line" =~ ^[[:space:]]*$ || "$line" =~ ^[[:space:]]*# ]] && continue
            [[ "$line" =~ $pattern ]] || nexus_fail 'Invalid local/repos.env syntax; see the example.'
            key=${BASH_REMATCH[1]}; value=${BASH_REMATCH[2]}
            case "$key" in
                NEXUS_REPO_SELECTOR|BASECAMP_REPO_SELECTOR|FOUNDRY_REPO_SELECTOR) ;;
                *) nexus_fail 'Unknown key in local/repos.env; only repository selectors are accepted.' ;;
            esac
            [[ "$seen" != *" $key "* ]] || nexus_fail "Duplicate local selector: $key"
            seen="$seen$key "
            [[ "$value" != -* && "$value" != *[[:cntrl:]]* ]] || nexus_fail "Invalid selector for $key"
            case "$value" in
                name:?*|id:?*|path:?*) ;;
                *:*) nexus_fail "Unsupported selector prefix for $key" ;;
                *) value="name:$value" ;;
            esac
            printf -v "$key" '%s' "$value"
        done < "$NEXUS_ROOT/local/repos.env"
        NEXUS_LOCAL_STATE='local/repos.env loaded as literal data'
    fi
}
nexus_selectors() {
    local selector selected
    for selector in "$NEXUS_REPO_SELECTOR" "$BASECAMP_REPO_SELECTOR" "$FOUNDRY_REPO_SELECTOR"; do
        "$NEXUS_ORCA" repo show --repo "$selector" --json >/dev/null || nexus_fail 'Configured selector could not be resolved; check local/repos.env and repo list --json.'
    done
    # Reject a Nexus selector that resolves successfully to another repository.
    selected=$("$NEXUS_ORCA" repo show --repo "$NEXUS_REPO_SELECTOR") || nexus_fail 'Cannot inspect Nexus selector.'
    [[ "$selected" == *"path: $NEXUS_ROOT"$'\n'* || "$selected" == *"path: $NEXUS_ROOT" ]] || nexus_fail 'Nexus selector does not resolve to this checkout; use its path: selector.'
}

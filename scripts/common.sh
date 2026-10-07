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
# Registry keys use one documented, dependency-free YAML layout, not a general parser.
nexus_repository_keys() {
    local keys
    keys=$(awk '
        /^repositories:[[:space:]]*(#.*)?$/ {
            if (seen++) { print "ERROR: duplicate repositories section." > "/dev/stderr"; exit 1 }
            active=1; next
        }
        active && /^[[:space:]]*(#.*)?$/ { next }
        active && /^[^[:space:]#]/ { active=0 }
        active && /^  [a-z][a-z0-9-]*:[[:space:]]*(#.*)?$/ {
            sub(/^  /, ""); sub(/:.*/, ""); print; next
        }
        active && (/^  [^ ]/ || /^ [^ ]/ || /^ *\t/) {
            printf "ERROR: unsupported repository key or indentation at line %d.\n", NR > "/dev/stderr"
            exit 1
        }
    ' "$NEXUS_ROOT/config/repositories.yaml") || nexus_fail 'Cannot read repository registry; use two-space unquoted block keys (inline comments allowed).'
    [[ -n "$keys" ]] || nexus_fail 'No logical repositories found; use two-space registry keys.'
    [[ -z $(printf '%s\n' "$keys" | sort | uniq -d) ]] || nexus_fail 'Duplicate logical repository keys.'
    printf '%s\n' "$keys"
}
nexus_selector_key() { printf '%s_REPO_SELECTOR\n' "$(printf '%s' "$1" | tr '[:lower:]-' '[:upper:]_')"; }
nexus_repository_known() {
    local repository
    while IFS= read -r repository; do [[ "$repository" != "$1" ]] || return 0; done <<< "$NEXUS_REPOSITORIES"
    return 1
}
nexus_local() {
    NEXUS_REPOSITORIES=$(nexus_repository_keys)
    NEXUS_LOCAL_STATE='defaults (local/repos.env absent)'
    local repository line key value seen=' ' allowed=' ' pattern
    while IFS= read -r repository; do
        key=$(nexus_selector_key "$repository")
        allowed="$allowed$key "
        printf -v "$key" '%s' "name:$repository"
    done <<< "$NEXUS_REPOSITORIES"
    pattern='^([A-Z0-9_]+)="([^"$`\\]+)"$'
    if [[ -e "$NEXUS_ROOT/local/repos.env" ]]; then
        [[ -f "$NEXUS_ROOT/local/repos.env" && -r "$NEXUS_ROOT/local/repos.env" ]] || nexus_fail 'local/repos.env must be a readable regular file.'
        # Literal data only: sourcing an env file would execute shell code.
        while IFS= read -r line || [[ -n "$line" ]]; do
            [[ "$line" =~ ^[[:space:]]*$ || "$line" =~ ^[[:space:]]*# ]] && continue
            [[ "$line" =~ $pattern ]] || nexus_fail 'Invalid local/repos.env syntax; see the example.'
            key=${BASH_REMATCH[1]}; value=${BASH_REMATCH[2]}
            [[ "$allowed" == *" $key "* ]] || nexus_fail 'Unknown repository selector key in local/repos.env.'
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
nexus_repo_selector() {
    nexus_repository_known "$1" || nexus_fail "Unknown logical repository: $1"
    local key
    key=$(nexus_selector_key "$1")
    printf '%s\n' "${!key}"
}
nexus_git_common_dir() {
    local directory
    directory=$(git -C "$1" rev-parse --git-common-dir 2>/dev/null) || return 1
    [[ "$directory" == /* ]] || directory="$1/$directory"
    (CDPATH= cd -- "$directory" 2>/dev/null && pwd -P)
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

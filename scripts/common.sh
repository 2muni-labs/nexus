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
# Compatibility loading only: existing CLI entrypoints retain their helper API.
# Provider-specific preflight lives in the adapter; loading it performs no CLI calls.
source "$(dirname -- "${BASH_SOURCE[0]}")/adapters/orca.sh"

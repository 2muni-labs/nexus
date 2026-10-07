#!/usr/bin/env bash
# Read-only adapter contract checks; no live Orca runtime or provider writes required.
set -euo pipefail
nexus_test_root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
nexus_test_tmp=$(mktemp -d "${TMPDIR:-/tmp}/nexus-preflight.XXXXXX")
trap 'rm -f -- "$nexus_test_tmp/mock-orca" "$nexus_test_tmp/output"; rmdir -- "$nexus_test_tmp"' EXIT
cat > "$nexus_test_tmp/mock-orca" <<'MOCK'
#!/usr/bin/env bash
case "$1 $2" in
    'status --json')
        case "${NEXUS_TEST_CASE:-}" in
            status-error) exit 1 ;;
            unreachable) printf '{"ok":true,"runtime":{"reachable":false}}' ;;
            *) printf '{"ok":true,"runtime":{"reachable":true}}' ;;
        esac ;;
    'skills get')
        case "${NEXUS_TEST_CASE:-}" in
            guide-error) exit 1 ;;
            guide-empty) : ;;
            *) printf 'installed guidance' ;;
        esac ;;
    'repo show')
        [[ "${NEXUS_TEST_CASE:-}" != selector-error ]] || exit 1
        if [[ "$*" == *--json* ]]; then printf '{}';
        else printf 'path: %s\n' "$NEXUS_TEST_REPO_PATH"; fi ;;
    *) exit 9 ;;
esac
MOCK
chmod +x "$nexus_test_tmp/mock-orca"
check() {
    local scenario=$1 expected=$2 actual=0 selected="$nexus_test_tmp/mock-orca" repo_path="$nexus_test_root"
    [[ "$scenario" != wrong-repo ]] || repo_path="$nexus_test_tmp"
    [[ "$scenario" != missing-executable ]] || selected="$nexus_test_tmp/missing"
    NEXUS_TEST_CASE="$scenario" NEXUS_TEST_REPO_PATH="$repo_path" ORCA_CLI_COMMAND="$selected" \
        bash -c 'set -euo pipefail; source "$1/scripts/common.sh"; nexus_root; nexus_local; nexus_orca; nexus_runtime; nexus_guide; nexus_selectors nexus' \
        nexus-test "$nexus_test_root" >"$nexus_test_tmp/output" 2>&1 || actual=$?
    if [[ "$actual" != "$expected" ]]; then
        cat "$nexus_test_tmp/output" >&2
        printf 'FAIL: %s expected %s, got %s\n' "$scenario" "$expected" "$actual" >&2
        exit 1
    fi
    printf 'PASS: %s\n' "$scenario"
}
check ok 0
check status-error 1
check unreachable 1
check guide-error 1
check guide-empty 1
check selector-error 1
check wrong-repo 1
check missing-executable 1
# Source-only loading must not invoke the selected backend.
ORCA_CLI_COMMAND="$nexus_test_tmp/missing" bash -c 'set -euo pipefail; source "$1/scripts/common.sh"' nexus-test "$nexus_test_root"
printf 'PASS: source has no backend side effects\n'
bash "$nexus_test_root/scripts/run.sh" --help >/dev/null
if bash "$nexus_test_root/scripts/weekly-review.sh" --help >"$nexus_test_tmp/output" 2>&1; then
    printf 'FAIL: legacy weekly-review must reject arguments\n' >&2; exit 1
fi
printf 'PASS: entrypoint argument compatibility\n'

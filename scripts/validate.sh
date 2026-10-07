#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
nexus_root
for directory in config docs prompts workflows scripts local reviews reviews/_template; do
    [[ -d "$NEXUS_ROOT/$directory" ]] || nexus_fail "Missing directory: $directory"
done
for file in README.md AGENTS.md .gitignore config/repositories.yaml config/routing.yaml \
    config/review.yaml docs/architecture.md prompts/coordinator.md \
    prompts/basecamp-reviewer.md prompts/foundry-reviewer.md prompts/integration-reviewer.md \
    prompts/validator.md workflows/weekly-review.md local/repos.env.example \
    reviews/README.md reviews/_template/summary.md scripts/common.sh \
    scripts/doctor.sh scripts/status.sh scripts/validate.sh scripts/weekly-review.sh; do
    [[ -s "$NEXUS_ROOT/$file" ]] || nexus_fail "Missing or empty required file: $file"
done
for script in "$NEXUS_ROOT"/scripts/*.sh; do
    bash -n "$script" || nexus_fail "Shell syntax invalid: $script"
    if [[ "$script" != "$NEXUS_ROOT/scripts/common.sh" ]]; then
        [[ -x "$script" ]] || nexus_fail "Script is not executable: $script"
    fi
done
for file in repositories routing review; do
    grep -Eq '^version: 1$' "$NEXUS_ROOT/config/$file.yaml" || nexus_fail "Invalid version header: $file.yaml"
    [[ $(sed -n '2,$p' "$NEXUS_ROOT/config/$file.yaml" | sed -n '/^[^ #]/p' | wc -l) -gt 0 ]] || nexus_fail "Missing top-level policy sections: $file.yaml"
done
# Check the index: ignored files force-staged into Git must still fail.
git -C "$NEXUS_ROOT" ls-files -z | while IFS= read -r -d '' file; do
    case "$file" in
        reviews/README.md|reviews/_template/*) ;;
        reviews/*) nexus_fail "Generated review artifact is tracked: $file" ;;
        local/repos.env|.runtime/*|.env|.env.local|*/.env|*/.env.local|.DS_Store|*/.DS_Store)
            nexus_fail "Local/runtime state is tracked: $file" ;;
    esac
done
for file in local/repos.env .runtime/probe .env .env.local .DS_Store reviews/2026/W41/summary.md reviews/report.md; do
    git -C "$NEXUS_ROOT" check-ignore --no-index -q -- "$file" || nexus_fail "Missing ignore rule: $file"
done
for file in local/repos.env.example reviews/_template/summary.md; do
    if git -C "$NEXUS_ROOT" check-ignore --no-index -q -- "$file"; then
        nexus_fail "Example configuration or review template is ignored: $file"
    fi
done
printf 'PASS: Nexus structure, shell syntax, executability, policy headers and local-state boundaries.\n'
printf 'Note: structural validation only; no full YAML schema or semantic policy validation.\n'

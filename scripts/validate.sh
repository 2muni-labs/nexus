#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
nexus_root
for directory in config schemas schemas/examples docs prompts workflows scripts local reviews reviews/_template; do
    [[ -d "$NEXUS_ROOT/$directory" ]] || nexus_fail "Missing directory: $directory"
done
for file in README.md AGENTS.md .gitignore config/repositories.yaml config/routing.yaml \
    config/review.yaml config/planning.yaml schemas/execution-plan.yaml \
    schemas/examples/single-repository.yaml schemas/examples/cross-repository.yaml \
    docs/architecture.md docs/routing.md docs/review-principles.md docs/worktree-lifecycle.md prompts/planner.md prompts/coordinator.md \
    prompts/basecamp-reviewer.md prompts/foundry-reviewer.md prompts/integration-reviewer.md \
    prompts/validator.md workflows/weekly-review.md workflows/feature-execution.md local/repos.env.example \
    local/capabilities.yaml.example scripts/run.sh \
    reviews/README.md reviews/_template/summary.md scripts/common.sh \
    scripts/doctor.sh scripts/status.sh scripts/validate.sh scripts/weekly-review.sh \
    scripts/adapters/orca.sh scripts/execution-backend.sh schemas/execution-backend.yaml \
    docs/adapters/orca.md docs/workflow-migration.md scripts/work-items.sh \
    scripts/adapters/github.sh schemas/work-item-provider.yaml docs/adapters/github.md \
    config/workflow.json schemas/workflow-observation.yaml scripts/workflow.sh scripts/workflow.jq \
    scripts/projects.sh scripts/adapters/github-projects.sh local/github.json.example docs/github-projects.md \
    scripts/reconcile.sh scripts/reconcile.jq scripts/workflow-policy.jq schemas/reconciliation.yaml docs/reconciliation.md; do
    [[ -s "$NEXUS_ROOT/$file" ]] || nexus_fail "Missing or empty required file: $file"
done
for script in "$NEXUS_ROOT"/scripts/*.sh "$NEXUS_ROOT"/scripts/adapters/*.sh; do
    bash -n "$script" || nexus_fail "Shell syntax invalid: $script"
    if [[ "$script" != "$NEXUS_ROOT/scripts/common.sh" && "$script" != "$NEXUS_ROOT/scripts/execution-backend.sh" && "$script" != "$NEXUS_ROOT"/scripts/adapters/* ]]; then
        [[ -x "$script" ]] || nexus_fail "Script is not executable: $script"
    fi
done
for file in repositories routing planning review; do
    grep -Eq '^version: 1$' "$NEXUS_ROOT/config/$file.yaml" || nexus_fail "Invalid version header: $file.yaml"
    [[ $(sed -n '2,$p' "$NEXUS_ROOT/config/$file.yaml" | sed -n '/^[^ #]/p' | wc -l) -gt 0 ]] || nexus_fail "Missing top-level policy sections: $file.yaml"
done
nexus_repository_keys >/dev/null
for file in "$NEXUS_ROOT/schemas/execution-plan.yaml" "$NEXUS_ROOT"/schemas/examples/*.yaml "$NEXUS_ROOT/local/capabilities.yaml.example"; do
    grep -Eq '^version: 1$' "$file" || nexus_fail "Invalid contract/example version: $file"
done
# Check the index: ignored files force-staged into Git must still fail.
git -C "$NEXUS_ROOT" ls-files -z | while IFS= read -r -d '' file; do
    case "$file" in
        reviews/README.md|reviews/_template/*) ;;
        reviews/*) nexus_fail "Generated review artifact is tracked: $file" ;;
        local/repos.env|local/capabilities.yaml|local/github.json|.runtime/*|.env|.env.local|*/.env|*/.env.local|.DS_Store|*/.DS_Store)
            nexus_fail "Local/runtime state is tracked: $file" ;;
    esac
done
for file in local/repos.env local/capabilities.yaml local/github.json .runtime/probe .env .env.local .DS_Store reviews/2026/W41/summary.md reviews/report.md; do
    git -C "$NEXUS_ROOT" check-ignore --no-index -q -- "$file" || nexus_fail "Missing ignore rule: $file"
done
for file in local/repos.env.example local/capabilities.yaml.example local/github.json.example reviews/_template/summary.md; do
    if git -C "$NEXUS_ROOT" check-ignore --no-index -q -- "$file"; then
        nexus_fail "Example configuration or review template is ignored: $file"
    fi
done
printf 'PASS: Nexus structure, shell syntax, executability, policy headers and local-state boundaries.\n'
printf 'Note: structural validation only; no full YAML schema or semantic policy validation.\n'

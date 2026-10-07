#!/usr/bin/env bash
set -euo pipefail
# Retain the v0.1 entrypoint; execution belongs to the Coordinator and Orca.
[[ $# -eq 0 ]] || { printf 'ERROR: weekly-review.sh accepts no arguments; use run.sh for custom context.\n' >&2; exit 1; }
exec "$(dirname -- "${BASH_SOURCE[0]}")/run.sh" --workflow weekly-review \
    --repository basecamp --repository foundry \
    --objective 'Review Basecamp/Foundry architecture and producer/consumer contracts.'

#!/usr/bin/env bash
# One scoped identity operation; never changes Git configuration or publishes.
set -euo pipefail
exec python3 -I -B "$(dirname -- "${BASH_SOURCE[0]}")/adapters/github-identity.py" "$@"

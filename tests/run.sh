#!/usr/bin/env bash
# All local checks. Provider/Project mutations use temporary mocks only.
set -euo pipefail
nexus_test_root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
"$nexus_test_root/scripts/validate.sh"
"$nexus_test_root/tests/orca-preflight.sh"
"$nexus_test_root/tests/execution-contract.sh"
command -v python3 >/dev/null 2>&1 || { printf 'Python 3 required only for development tests.\n' >&2; exit 1; }
python3 -B -m unittest discover -s "$nexus_test_root/tests" -p 'test_*.py'

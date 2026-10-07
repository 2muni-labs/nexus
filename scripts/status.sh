#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
nexus_root
nexus_backend_preflight
nexus_local
nexus_backend_status "$@"

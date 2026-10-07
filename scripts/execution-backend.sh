# Composition and read-only execution port. No scheduling or lifecycle mutation.
nexus_backend_load() {
    case "${NEXUS_EXECUTION_BACKEND:-orca}" in
        orca) source "$(dirname -- "${BASH_SOURCE[0]}")/adapters/orca.sh" ;;
        *) nexus_fail "Unsupported execution backend: ${NEXUS_EXECUTION_BACKEND}. No fallback." ;;
    esac
}
nexus_backend_preflight() { nexus_backend_load; nexus_adapter_preflight; }
nexus_backend_repositories() { nexus_backend_load; nexus_adapter_repositories "$@"; }
nexus_backend_status() { nexus_backend_load; nexus_adapter_status "$@"; }
nexus_backend_context() { nexus_backend_load; nexus_adapter_context; }
nexus_backend_observation() { nexus_backend_load; nexus_adapter_observation "$@"; }

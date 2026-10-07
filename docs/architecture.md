# Architecture

```text
                     User
                       │
                       ▼
                Nexus Coordinator
                       │
                       ▼
                     Orca
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
      Basecamp Worker      Foundry Worker
             │                   │
             ▼                   ▼
       isolated WT          isolated WT
             │                   │
             └─────────┬─────────┘
                       ▼
              Structured Results
                       │
                       ▼
                  Coordinator
                       │
              ┌────────┴────────┐
              ▼                 ▼
       implementation         backlog
              │
              ▼
          validation
              │
              ▼
          human review
```

| Plane/domain | Owner | Contract |
| --- | --- | --- |
| Control plane | Nexus | Intent, metadata, ownership, routing, policy, prompts, workflows, normalized findings/decisions/history |
| Execution plane | Orca | Worktrees, terminals, dispatch, supervision, lifecycle, signalling, recovery |
| Host environment | Basecamp | macOS, MacPorts, packages, shell/PATH, tools, agent CLI and Docker host prerequisites |
| Project runtime | Foundry | Docker/Compose, bootstrap, containers, project-local environment and worktree-safe runtime |
| Future implementation domains | Future managed repositories | Explicitly assigned responsibility and producer/consumer contracts |

One task = one owner = one repository = one isolated worktree = one diff = one review decision.
Review outputs may have no diff. Integration review works from normalized results in
Nexus; access to both implementation repositories from one worker is unnecessary.
A cross-repository objective creates independently owned tasks, never a combined commit.

Nexus policy deliberately requires stronger checkout isolation than Orca's generic
shared-workspace default. Use the installed placement guide to realize it. Orca owns
all task execution state; Nexus history records the evidence and review decisions.
There is no scheduler, task database, application runtime, submodule, subtree, or
custom worker framework here.

`config/` holds portable policy. `local/repos.env` holds ignored machine selectors.
`scripts/common.sh` shares only root discovery, data parsing, CLI selection and read-only
preflight helpers across four entrypoints. It performs no dispatch or lifecycle action.
Scripts are Bash for `pipefail`, with portable Unix utilities and macOS Bash 3.2 support.
Validation is structural, not a full YAML parser or semantic policy checker.

The weekly-review entrypoint exposes the installed guide and execution brief. The
Coordinator reads policy, selects available agent capabilities, launches parallel waves
when independent, and applies the acceptance/validation gates. Optional secondaries
are not prerequisites. Independent validation requires a separate session even when
only one agent family is available. Human review controls every merge.

To add a repository, add its ownership entry, reviewer prompt and workflow scope.
Add a local selector only where needed; the core architecture does not change.
The current helper scripts diagnose the three v0.1 repositories explicitly; extending
that diagnostic list is a small manual edit, not a new orchestration engine.

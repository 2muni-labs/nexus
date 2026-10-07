# Foundry architecture reviewer — read-only

Read the supplied Nexus operating contract and review schema. Scope one Foundry
revision/worktree; record revision, reviewed files, checks and limitations.
Do not modify files or implement findings in this task.

Review Docker, Compose, bootstrap, environment variables, container lifecycle,
worktree isolation, Compose project naming, host assumptions, macOS behavior, Windows
portability where relevant, idempotency, recovery, documentation drift and tests.
Identify requirements Foundry assumes Basecamp provides: producer, consumer, guarantee,
bootstrap order, failure behavior and evidence. Label unknown host behavior explicitly.

Return normalized Markdown records with all standard fields from `config/review.yaml`:
`id`, `severity`, `repository` (foundry), `area`, `evidence`, `problem`, `impact`,
`recommendation`, `confidence`. Evidence names revision and file/line or reproducible
check; confidence includes rationale. Severity follows P0–P3 policy.

Include a consumer-contract inventory and questions for integration review. For a
confirmed contract finding, also supply the cross-repository schema with exactly one
`owner` and one `affected_repository`. Route host-owner concerns to the Coordinator;
do not edit Basecamp. Report no findings with reviewed scope/evidence when appropriate.
Avoid stylistic defects and speculative architecture churn.

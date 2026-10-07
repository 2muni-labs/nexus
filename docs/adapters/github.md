# GitHub Work Item provider

`schemas/work-item-provider.yaml` defines logical Work Items; GitHub is the only current
provider. `scripts/work-items.sh` is a one-operation CLI binding, not a workflow daemon.
It uses installed `gh` authentication and `jq` for structured JSON; it never loads Orca.
Issue identity is its canonical GitHub URL. Native node IDs remain adapter metadata.

Read: `issue-read`, `issue-list`, `pr-read`, `pr-list`, `review-checks-read` with explicit
OWNER/REPO and (for item reads) a positive number. List results are complete paginated
normalized Work Items; review/check reads normalize review and check observations,
not automatic acceptance. Native details remain opaque adapter metadata. Missing reviews/checks is not PASS.

Write: `issue-create`, `issue-update`, `pr-create`, `association-comment` take a JSON file.
All require `operation_id`; creates also title/body, PRs explicit distinct head/base;
updates/comments require number and expected_updated_at. Issue changes support title,
body, labels, milestone and state. Preserve current human content when constructing a
body update; default PR drafts require published head branches, but this tool never pushes.
Association comments carry reviewed sanitized task/attempt/backend/PR associations.

By default a write returns a prepared plan and its Git blob `plan_oid` without an API write.
After the exact plan has human authorization, apply with `--apply --approved-plan OID
--approval-reference REF`. The reference names the real human decision; supplying a string
cannot create authority. Repo/action/payload changes invalidate the digest. User authorization
to implement/commit Nexus does not authorize publishing Issues, PRs or comments.

One Coordinator owns writes to a Work Item. Updates recheck expected_updated_at, but this
is not atomic CAS: stop if concurrent writers exist. Creates/comments use a stable operation
marker and lookup every page before writing. A matching prior result is recovered without
another write; contradictory markers require reconciliation. On timeout/error preserve the
plan and inspect external state; never automate a retry or presume an absent lookup proves
absence. GitHub mutations are not globally transactional or guaranteed exactly-once.

A durable association comment records schema version, Work Item URL, logical task and
attempt IDs, selected backend, sanitized external receipt reference, exact artifact/head
revision, PR URL, validation result/evidence reference and applicable human approval scope.
It excludes machine paths, credentials, transcripts and private report contents. Store only
human-reviewed metadata. Human edits and PR merge/check outcomes remain authoritative.

Default is one Issue/Work Item/mutable worktree/PR. Keep remediation attempts under the same
Issue; record linked splits for independently reviewable scope. GitHub record open/closed
state is distinct from the six-state workflow. Projects status is added separately.
No merge, push, deletion or automatic Project/Issue publication is implemented.

API behavior is grounded in installed `gh api` help and
[GitHub Issues REST documentation](https://docs.github.com/en/rest/issues/issues) and
[Pull Requests REST documentation](https://docs.github.com/en/rest/pulls/pulls).
Tests use a mock CLI; no remote Issue/PR was created for verification.

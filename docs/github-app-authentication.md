# GitHub App authentication

Production GitHub provider calls use a fresh installation token for each existing
`gh api` or `gh pr view` invocation. Python 3.9+ standard library, installed OpenSSL
and installed `gh` are required. No personal `gh` login or inherited personal token
is a fallback. No token service, permanent cache, daemon or global credential change
is introduced. Human approval and source-head checks remain required; PR write-plan digests now
also bind private commit-identity context. Authentication does not authorize publication.

Copy `local/github-app.json.example` to ignored `.runtime/github-app.json` after
creating `.runtime/`. Fill the null values locally: positive App ID, absolute
external private-key file path, exact canonical repository name and numeric ID,
and that repository's installation ID. The example deliberately contains no
deployment identifiers or key path and is invalid until configured. To use another
local JSON file, set `NEXUS_GITHUB_APP_CONFIG` to its path; keep that file outside
tracked material. JSON is data, never sourced or executed. Unknown top-level or
binding keys and duplicate JSON keys fail. This configuration is separate from
the existing Project mapping in `local/github.json` / `NEXUS_GITHUB_CONFIG`.

The private key must reside outside the checkout, be RSA with at least 2048 bits,
owned by the invoking user, mode 0400 or 0600, and a regular file with one hard
link. Symlinks in any component are refused. Parent directories must belong to
the user or root and disallow group/other writes (sticky temporary directories
are allowed). Use the physical absolute path on hosts whose temporary-directory
aliases are symlinks. The verified descriptor stays open through signing to avoid
path replacement between validation and use. Keys with passphrases are unsupported;
there is no interactive prompt. POSIX ownership/mode checks do not audit additional
host ACL policy; the operator must provision the external key appropriately.

Each repository binding's `permissions` is a local ceiling within existing App
installation grants, not a request to change the registration. The helper requests
only the following permissions for the actual command, always with metadata/read:

| Existing command | Additional requested permissions |
| --- | --- |
| Issue/comment REST reads | issues/read |
| Issue/comment approved REST writes | issues/write |
| PR REST reads and `gh pr view` review/check rollup | pull_requests/read |
| Approved PR creation | pull_requests/write, contents/read (exact target-base identity range) |
| App bot identity resolution | metadata/read only |
| Exact source Git ref read | contents/read |
| Project GraphQL reads | issues/read, organization_projects/read |
| Approved Project GraphQL mutation | issues/read, organization_projects/write |

Configure only applicable ceilings; missing permissions fail before a provider
command. User-owned Projects that an installation cannot access remain unavailable;
no personal-token fallback is attempted. Organization Project permission applies
to organization resources: narrowing repository IDs does not isolate the entire
organization Project. Existing exact Project mappings, identity checks and reviewed
write plans retain that responsibility. The PR observation uses the existing
GraphQL rollup, rather than the REST checks/statuses APIs; it adds no new grants.
Unavailable rollup fields/access fail closed and require read validation in the
actual deployment. Fork source refs require a separate exact repository binding
and installation for their owner; no token spans the source and target repositories.

The helper verifies the authenticated App, installation ID/App/owner/type and
suspension, exact repository installation, and current permission grants. It
requests one numeric repository ID and the command's exact permissions. Returned
permissions and expiry (UTC, more than 30 seconds remaining, at most one hour plus
clock tolerance) must match. The token-authenticated repository inventory must
contain exactly the configured ID and canonical name. One repository fits one page;
additional pages, incomplete inventories, aliases and overbroad access are refused.
Existing provider REST/GraphQL pagination flags are passed through unchanged.
Variable-length and stateless installation-token formats are supported.

JWTs and tokens stay in memory. OpenSSL receives the verified key via an inherited
file descriptor and signs stdin into stdout; neither secrets nor the key path enter
command arguments. Authentication uses fixed-origin TLS without redirects or
environment proxies. The `gh` child receives only its token in a scoped environment,
minimal host variables and an empty temporary configuration directory. Personal
tokens, debug/tracing, proxies, custom CA/loader/config inputs and user `gh` configuration
are not inherited. No key/JWT/token is written to disk. Child stderr is suppressed,
failed stdout is withheld, credential-bearing stdout is rejected, and errors use
fixed diagnostics without response bodies or exception traces.

Issued tokens are revoked in `finally`, including validation and command failures.
Failed commands retain their exit status; successful commands become failures if
revocation is unknown. Timeout, process interruption, host failure or a lost token
issuance response can prevent confirmed revocation; expiry bounds remaining access.
No authentication or provider command is replayed. After an ambiguous write or
revocation failure, preserve the reviewed plan and reconcile externally before
retrying; publication may already have happened.

Offline tests explicitly set `NEXUS_GITHUB_OFFLINE_FIXTURE` to an executable absolute
fixture path. This deliberately bypasses App authentication and executes only the
existing command shape, with minimal environment plus `MOCK_*` fixture data; its
results are unauthenticated test evidence. Do not set it in production. The former
`NEXUS_GH_COMMAND` override is refused in production. Authentication tests instead
import the helper, mock its fixed HTTP transport, and generate temporary test-only
keys; they never read deployment credentials or contact GitHub. Run `bash tests/run.sh`.

Sources: installed `gh help environment`, `gh api --help`, `gh pr view --help`, and
GitHub's [JWT requirements](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app),
[App and installation-token API](https://docs.github.com/en/rest/apps/apps), and
[installation inventory/revocation API](https://docs.github.com/en/rest/apps/installations).

## Git commit identity and publication

App authentication selects the push/PR actor; Git author and committer are separate
metadata. `scripts/commit-identity.sh identity OWNER/REPO` resolves the authenticated
App slug from `/app`, then the exact `<slug>[bot]` user with the repository-scoped
installation token. The response must be type `Bot` with a positive numeric user ID
and matching login. Email is derived as `<bot-user-id>+<bot-login>@users.noreply.github.com`;
App, installation and organization IDs are never substituted for the user ID. Tokens
are revoked on identity resolution failures too. No extra secret configuration is added.

Use the following explicit operations in the owned isolated checkout. Identity
resolution uses the same App configuration and no personal credential fallback:

```text
scripts/commit-identity.sh preflight OWNER/REPO /absolute/checkout
scripts/commit-identity.sh commit OWNER/REPO /absolute/checkout EXACT_BASE /absolute/message.txt
scripts/commit-identity.sh verify OWNER/REPO /absolute/private-pr-request.json
```

`preflight` checks effective `git var` author and committer and rejects inherited
personal identity. `commit` uses a scoped child environment for all four author and
committer name/email values, overriding host personal defaults without writing Git
configuration. Conflicting author/committer overrides, `EMAIL`, injected `GIT_CONFIG*`
and repository/object/index redirection inputs fail with fixed diagnostics that do
not disclose values. Matching explicit identity variables are allowed. The helper
checks the expected parent and refuses main, creates only a normal staged commit,
then verifies actual raw commit metadata. It offers no amend/rebase/rewrite options;
an unexpected local result must be preserved and reconciled before retrying.
Existing signing and hook configuration remains applicable; attribution does not
imply a verified signature. No global/shared Git identity settings are changed.

New PR requests must include this private identity context:

```json
"commit_identity": {
  "checkout": "/absolute/owned/checkout",
  "base_revision": "<exact target-base SHA>",
  "preserved_commits": []
}
```

The prepared plan digest binds this context, source branch and exact head. The
public PR payload excludes checkout paths and provenance. Old requests missing
identity context fail closed and must be prepared again under exact approval.
Apply reads the complete caller request once and carries that snapshot through
planning, preflight and final transport. Later changes to the caller file cannot
replace its approved body, candidate or exemptions. The transport captures payload
bytes before authentication, validates that snapshot and supplies those same bytes
to `gh` through stdin. A changed caller file may therefore still submit the unchanged
approved payload; an invalid approved checkout/head/context blocks the write.
Apply verifies the checkout branch/head and every raw author/committer in the
complete `base_revision..expected_head_revision` graph, including merged side
branches. It does not use mailmap display identity or replacement objects; shallow
or grafted history blocks verification. The actual authenticated target base ref
must match `base_revision`, so choosing a later base cannot hide personal commits.
PR POST checks the same metadata against the **same authenticated App** as the write
and rechecks target base and source head using contents/read immediately before the
provider call. Fork source reads retain a separate exact repository installation
token, revoked independently; no token spans source and target. This is the additional permission for
PR creation; identity-only resolution requests metadata/read. Remote ref checks and
PR registration are not atomic: retain one writer and reconcile any moved candidate.

Original human/upstream commits are preserved, never relabeled or rewritten. To
include one newly reachable original object, `preserved_commits` must contain its
`revision`, an immutable `source_revision` containing that same object, and a
nonempty `approval_reference` naming an independently reviewed exact original-source
exemption. The candidate head cannot be exempted. Equality of the two SHAs alone
supplies no provenance authority. The Coordinator must verify the real reference,
original source and exact exemption before approving the plan; a supplied string
cannot create authority and unknown provenance means HOLD. Implementation authority
cannot exempt a newly created personal automation commit. Cherry-picked or rewritten
objects require their own classification and review; they cannot inherit an exemption
for a different original SHA. Pre-existing commits below the pinned base retain their
metadata, including accepted main and merged PR history.

There is no push adapter in Nexus. Before any separately authorized manual App push,
run `verify` on the exact candidate and check immutable provenance/exemption authority;
then retain the existing repository-scoped App transport and credential handling.
The standalone `verify` also observes and pins the authenticated target base; it
checks local candidate objects before a branch has been pushed. Raw Git or Orca
pushes cannot be intercepted by this helper, so the Coordinator must
HOLD an unverified push. Do not put tokens/private keys in arguments, commit metadata,
tracked configuration or reports. This implementation introduces no push capability
and no live publication authority.

The independent validator checks the exact candidate in a fresh session/worktree;
it is neither the Git author nor the authenticated publishing actor. Human publication
and final merge decisions remain separately scoped approvals. Bot attribution proves
metadata consistency only; it does not prove authentication, signature verification,
independent acceptance or human approval. Offline fixtures and temporary commits remain
unauthenticated test evidence, not live account/attribution evidence.

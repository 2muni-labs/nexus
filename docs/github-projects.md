# Repository-specific GitHub Projects

Each logical repository maps to its own GitHub repository and linked Project in ignored
`local/github.json`; copy `local/github.json.example` and set the real Project number.
Do not share a configured Project among repository owners, including owner case aliases. The owning repository handles
its Work Items; Nexus coordinates dependencies across normalized inputs. This maintenance
run configures only Nexus, never another repository's board.

GitHub Projects are user/organization-owned and linked to repositories. A repository's
`/projects` page is a listing, not the Project number/URL. Inspect the exact user/org Project
and its repository link. Credentials remain in `gh` credential storage, never config.
No key or token plaintext belongs in local mappings or reports.

`scripts/projects.sh read nexus` reads a complete paginated field/item inventory and emits
canonical workflow status and priority. `field-update nexus request.json` prepares an exact
single-field write plan. Requests specify Issue URL, status/priority, expected current value
(or null for an unset field), and desired canonical value. Actual writes require matching
plan digest and real human approval reference. Reobserve after mutation; a successful
transport alone is not completion. A repeat already at the desired value does not write.
Changed/unmapped human values, missing options, duplicate items or incomplete inventory HOLD.
Both outer field/item page chains must finish explicitly; truncated/error pages cannot
produce an update plan even if the desired item appears on a partial page.
Pre-write comparisons are not atomic CAS; retain one Coordinator writer and reobserve
concurrent human changes rather than claiming transactional synchronization.

The configured canonical status field must expose six distinct values: Backlog, Ready,
In Progress, Blocked, Review, Done. Priority supports P0–P3. Native field/option IDs and
names are adapter metadata; core workflow uses logical fields and values. The field may
be named `Workflow` to preserve GitHub's default Status field; in that case Workflow is
the sole Nexus-authoritative lifecycle field, and the default field is unmanaged display
metadata. Configure table/board grouping to use Workflow; never read the default field as
a competing lifecycle source. Existing projects may instead map their canonical Status field.

The Coordinator evaluates a fresh observation with `scripts/workflow.sh`, then prepares
only an authorized Project field change. Proposed transitions do not claim updates occurred.
Human changes must be observed first. No automatic Project creation, Issue publication,
merge, scheduling or retry is added by this tool.

Current account authentication has Projects access, but inspection found no existing user
Project or Nexus-linked Project. Local fixtures verify fields/options, owner isolation,
stale values, exact approvals, mutation response identity, reobservation and idempotent
updates. Live field synchronization requires a separately approved board setup and an
existing Issue item; none is fabricated for tests.

Implementation follows the installed GitHub CLI and
[GitHub Projects API guidance](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects).

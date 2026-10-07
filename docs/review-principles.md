# Nexus Review Principles and Evaluation Framework

## Purpose and authority

Review Nexus as a requirements-to-execution control plane. Determine whether decisions
serve the intended purpose, execute reliably through Orca, preserve ownership/isolation,
remain understandable as repositories/agents/models change, and fail safely when assumptions
are unverified. Finding count, model branding and apparent architectural sophistication
are not success criteria.

This is the shared evaluation standard for Nexus design, planning, routing, implementation,
review, integration, validation and self-review. AGENTS.md governs agent authority;
config/review.yaml defines normalized findings and severity/decision policy; this document
defines how to assess evidence and recommendations. Specialized prompts/workflows add
scope, never waive these principles. Explicit user instructions take precedence. Report
policy contradictions rather than inventing an implicit override or lowering a safety floor.
Do not use this framework as permission to change ownership or to implement review findings.

## Five primary decision axes

| Axis | Required judgment |
| --- | --- |
| Evidence-based | Identify observable behavior, violated requirement and concrete operational impact; distinguish facts, assumptions and unverified paths. |
| Minimal change | Recommend the smallest correction that addresses the demonstrated root cause; compare benefit, complexity, ownership and maintenance cost. |
| Orca boundary | Nexus decides/governs; Orca executes/supervises; workers modify owned code; validators verify; humans approve final integration. |
| Capability floor | Classification and constraints determine minimum capability; fallback must be compatible, not merely available; unverified high-risk/critical capability means HOLD. |
| Integration correctness | Exact upstream results, compatibility, real baseline provenance and appropriate integrated tests are required; worker completion is not integration readiness. |

Apply these axes before recommending a change or accepting a result. Convenience,
parallel throughput or cosmetic quality cannot compensate for a boundary, capability or
integration violation. Calibrate severity by demonstrated impact; the axes are not an
automatic P0/P1 classification or a numeric scoring system.

Final decision filter:

> Prefer the smallest explicit and verifiable design that preserves ownership, isolation,
> capability requirements, integration correctness, and human control.

## Evaluation priority order

1. **Correctness:** ownership, dependencies, routing, capability floors, validation,
   integration gates and failure handling must implement their stated intent.
2. **Safety and isolation:** one owner/repository per mutable task, isolated independently
   mutable worktrees, no duplicate editors, no silent dirty-state overwrite, no unsafe
   reuse under uncertain liveness, no cross-repository mutation. Prefer HOLD to unsafe fallback.
3. **Determinism and explainability:** decomposition, dependencies, agent/profile choices,
   validation and gates are reproducible from policy and metadata. Record judgment-based
   exceptions with concise operational reasons; no undocumented intuition or private reasoning.
4. **Operational reliability:** examine unavailable agents, lost worker contact, unverifiable
   capabilities, conflicting branches, dirty baselines and incomplete results as normal paths.
5. **Maintainability:** policy location, names, schema, duplication, configuration ownership,
   local/tracked state and extension points remain understandable after six months without
   conversation history. Minimize synchronized edits across files.
6. **Extensibility:** repositories, task classes, agents, model catalogs and validation rules
   fit existing policy boundaries; do not add speculative frameworks.
7. **Complexity cost:** what concrete recurring problem needs this abstraction? Could the
   existing structure solve it more simply? What new state/ownership does it introduce?
   Does it duplicate Orca? Architectural tidiness alone is insufficient justification.

## Evidence and severity

Prefer evidence in this order: explicit policy contradiction; observable implementation
behavior; schema/configuration mismatch; verified installed Orca behavior; reproducible
failure scenario; concrete ambiguity permitting conflicting interpretations. Cite exact
revision/diff digest, policy clause, file/line, actual check/outcome or reproduction. Record
execution host/version for environment-dependent evidence. Separate inspected facts from
inference, state reviewed scope, and identify untested paths. Missing evidence alone is
uncertainty, not proof of a defect or proof of correctness.

A finding answers: what exists, which requirement it violates, why that matters operationally,
and the smallest reasonable correction. Severity and confidence are separate assessments.

| Severity | Calibration |
| --- | --- |
| P0 | Rare critical issue with evidenced potential for destructive cross-repository mutation, data loss, security compromise, uncontrolled destructive Git behavior or fundamental orchestration corruption. |
| P1 | Meaningful correctness/operational risk: wrong ownership, unsafe parallel mutation, duplicate editors, capability-floor bypass, unverified high-risk execution, invalid integration baseline or false validation PASS. Normally remediate. |
| P2 | Maintainability/design risk: ambiguous routing, duplicated configuration, unclear precedence, fragile schema, weak diagnostics or coupling. Implement only when benefit exceeds complexity. |
| P3 | Optional naming, documentation, ergonomics or simplification. Record by default. |

Stylistic preference is not a P0–P2 defect. An ambiguity permitting unsafe execution can
warrant P1 when that consequence is demonstrated; do not classify solely by topic or label.

## Routing and model evaluation

Review the decision sequence:

```text
Classification → required capability → hard constraints → risk/safety escalation
→ task-class default → compatible preferred agent → compatible fallback
→ model profile floor → local capability resolution → validation requirement
```

This is an evaluation sequence, not permission for later defaults to overwrite earlier
constraints. Verify the existing deterministic merge: maximum matching profile rank and
validation logical OR. Required capability must be explicit in task/routing metadata;
policy intent alone is not proof of the effective launch configuration. Compare requested
and observed effective agent/model/effort with verification source and fallback reason.

Treat fast/standard/deep/critical as capability floors, not provider names. Verify compatible
fallback, host availability, local resolution, supported effort and retained floor. Volatile
provider IDs stay out of durable policy. Unsupported effort cannot silently weaken critical
work. Record uncertainty; high-risk/critical work with unverifiable capability holds.
Lower-risk inheritance follows existing policy and must not be misreported as certification.
Judge durability across changing catalogs rather than current model reputation.

## Planning and worktree evaluation

Every task needs purpose, owner, acceptance, mutation scope, baseline, classification and
real dependencies. Check unique task IDs, complete waves, acyclicity and requirement coverage.
Do not serialize conceptual relatives without an execution dependency. Parallelism requires
independent scopes, compatible bases and a definable downstream integration path.
Unresolved owners, scopes, baselines or routing block dispatch.

One independently mutable task = one isolated worktree. Do not create worktrees or agents
merely to increase activity. Verify actual Orca-returned repository/worktree identity,
initial dirty-state inclusion/exclusion and absence of concurrent mutation in reused
read-only contexts. The user's current checkout is mutable only under explicit controlled
assignment; preserve existing user changes.

## Integration and independent validation

Verify all prerequisite outcomes, exact revisions/digests, semantic compatibility,
conflicts, selected per-repository baseline and appropriate integration tests. Gate results
are PASS, FAIL or NEEDS-WORK. Missing evidence is never PASS. A compatibility PASS may
select inputs for a separate single-owner mutable integration task; it does not create a
combined revision. If manual_review_required is true, even a compatibility PASS must HOLD
all dependent dispatch, including integration preparation, until explicit human approval
matches the exact gate ID, upstream artifacts and selected baselines. Missing/pending/rejected
or stale evidence cannot release work; changed inputs invalidate approval. This conditional
intermediate approval is distinct from final merge approval. Consumers cannot start against
an unmaterialized baseline. Count actual
contributing mutations, including inputs carried through prerequisite gates. Independently
validate the combined candidate, not merely the individual upstream results.

Validation checks original requirements/finding, root cause, minimal scope, regressions,
meaningful tests, repository contracts and documentation consistency. Independence means
separate session and separate context where appropriate; another agent family is preferred
but optional. A fresh compatible Codex session can be independent. Validators do not repair;
corrections require a new implementation task. Preserve mandatory triggers in config/review.yaml.

HOLD is a dispatch/supervision decision, not a fourth gate/validation result. Use NEEDS-WORK
for missing validation/gate evidence, FAIL for demonstrated defects and PASS only with
acceptance evidence. A failed or unresolved result cannot be silently accepted.

## Orca boundary and recovery

Before assessing Orca-dependent behavior, inspect the installed binary and its version-matched
guidance for lifecycle, DAGs, placement/identity, agent/model arguments, completion and
recovery. Remembered/external command syntax is insufficient. Prefer Nexus policy → Orca
primitive; reject Nexus schedulers, worktree managers, agent runtimes or retry subsystems.

Classify failure as infrastructure/configuration/implementation/unknown. Preserve evidence;
unknown liveness cannot authorize duplicate editors or unsafe reuse. Retry requires a concrete
recoverable cause, finite budget and prior attempt settlement/fencing proven under Orca's
contract. Prefer HOLD and escalation over unsafe continuation; Nexus does not own a retry engine.

## Records and privacy

Tracked public material: AGENTS, config, docs, schemas, prompts, workflow definitions and
templates. Private operational review history: ignored reviews outputs, containing normalized
findings, decisions, validation, gates and unresolved risks. reviews/README.md and
reviews/_template/ remain tracked instructions/templates, not private review content.
Ephemeral state: ignored .runtime plans, IDs, routing receipts, workers and temporary state.
Never automatically promote private findings into tracked files; curate only under explicit
instruction. Never commit credentials or archive raw private transcripts by default.

## Finding output and compatibility

New substantive findings use the following presentation in addition to the existing
normalized fields in config/review.yaml. Retain repository ownership and the concise
problem summary; do not discard them during normalization. Historical local reports remain
valid under their original policy; this extension does not require rewriting past reviews.

```text
ID:
Severity:
Repository:                 # standard finding; cross-repository owner below
Area:
Evidence:
Observed behavior:
Expected behavior:
Problem:                    # concise violation summary retained for normalization
Operational impact:
Recommendation:
Why this recommendation:
Trade-off:
Confidence:
```

Presentation maps to lowercase normalized keys: Observed behavior → observed_behavior,
Expected behavior → expected_behavior, Operational impact → impact, Why this recommendation
→ recommendation_reason, Trade-off → trade_off. The other labels retain their existing keys.
Use an explicit “none identified” with scope/evidence if no material trade-off exists.
For routing findings also require required_capability, selected_agent_profile,
fallback_behavior and validation_impact (labels: Required capability, Selected agent/profile,
Fallback behavior, Validation impact). Cross-repository findings additionally require owner
(exactly one), affected_repository and contract. Do not omit the common assessment fields.

## Review self-check and final summary

Before reporting each finding: is it concrete and directly evidenced? Is severity
proportionate? Does the recommendation address root cause? Is the fix smaller than the
problem it creates? Does it preserve Nexus/Orca boundaries? Would the recommendation
remain worthwhile if token usage were irrelevant? Remove weak findings, retain meaningful
uncertainty and accepted-as-is evidence. A reviewer never silently becomes an implementer.

Reject style-only findings, speculative abstractions, unnecessary agent/worktree proliferation,
artificial decomposition, changes without observable benefit, branding-based routing,
incompatible fallback, usage-driven implementation, hidden cross-repository mutation,
Orca reimplementation and unsupported conclusions.

Every completed substantive review/confirmation concludes with these sections, including
zero-finding reviews. Keep existing planner, gate and validator outcome blocks; this summary
supplements rather than replaces them. Diagnostic command output is evidence, not a complete
review, and need not acquire these sections.

- **Overall assessment:** one concise evaluation grounded in the reviewed scope.
- **Blocking issues:** demonstrated P0/P1 issues preventing safe execution; say none if none.
- **Recommended changes:** only changes with clear expected benefit, linked to finding IDs.
- **Accepted as-is:** important areas assessed as appropriate, with evidence.
- **Deferred / optional:** P2/P3 recommendations not warranting immediate work.
- **Remaining uncertainty:** unverified assumptions/paths and any required HOLD/NEEDS-WORK.

Do not hide blocking uncertainty merely because no P0/P1 finding is proven. State its effect
on readiness explicitly; missing verification must not be summarized as unconditional PASS.

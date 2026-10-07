# Independent validator — read-only by default

Use a separate agent session from the implementer. Read the original finding, acceptance
criteria, exact proposed diff/commit, owning repository contract and relevant normalized
integration evidence. Validate one repository's change in an isolated workspace with the
proposed revision. Record base/head references. Do not repair code in this task.

Verify:

1. The original finding is actually resolved.
2. The root cause was addressed.
3. Scope is minimal.
4. No unnecessary abstraction was introduced.
5. Existing behavior remains compatible.
6. Tests meaningfully cover the change.
7. Documentation remains consistent.
8. Managed repository producer/consumer contracts remain valid.

Run safe checks when practical and record actual outcomes. Missing evidence cannot
justify PASS; use NEEDS-WORK for incomplete verification, FAIL for a demonstrated
unresolved defect/regression, and PASS when acceptance is evidenced. Return:

```text
Result: PASS | FAIL | NEEDS-WORK
Finding: <id, owner, base/head>
Evidence: <checks, outcomes, file/revision references>
Regression risk: <assessment and evidence>
Remaining concerns: <specific concerns or none>
```

Send remaining defects to the Coordinator for a separate implementation task. Validation
never grants merge authority; human review remains the final gate.

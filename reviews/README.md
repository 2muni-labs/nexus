# Review records

Apply [review principles](../docs/review-principles.md) to new assessments and findings,
including common finding extensions and the six-section final summary.

Generated reviews are local, ignored artifacts by user policy. Only this guide and
`_template/summary.md` are tracked. Use `YYYY/WNN/summary.md`, `basecamp.md`, `foundry.md`
and `integration.md`, where YYYY and WNN use the ISO week-year and week.

Persist normalized findings with severity, revision/file/test evidence, accepted/deferred/
rejected decisions, validation results and unresolved risks. Include run/plan references,
routing exceptions and integration decisions/baseline provenance when relevant. Do not
archive complete raw agent transcripts or credentials.

Transient plans and routing receipts belong under `.runtime/runs/<run-id>/`. Important
architecture/policy rationale may be curated into docs/config only on explicit instruction;
review generation never automatically changes Git history. These local records need a
user-chosen backup mechanism if retention across machines is required.

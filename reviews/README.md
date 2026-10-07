# Review history

Store portable normalized results under the ISO week-year and week:

```text
reviews/YYYY/WNN/
  summary.md
  basecamp.md
  foundry.md
  integration.md
```

Start the summary from `_template/summary.md`. Repository/integration reports use
`config/review.yaml`, including stable finding IDs, severity, revision/file/check evidence,
confidence and exactly one implementation owner for contract findings. Record reviewed
scope and limitations even for no findings. Keep references logical and portable.

Persist accepted decisions, deferred decisions, rejected recommendations (with rationale),
validation results and unresolved risks. Link each accepted finding to its single-repository
proposal and independent validation evidence. Distinguish accepted work from approved merge.
Track human decisions per diff. Counts refer to deduplicated findings, including contract
findings once. Repeated runs in the same week update the summary with dated entries and
preserve earlier decisions rather than silently replacing them.

Do not store full raw agent transcripts, credentials, machine paths, Orca internal IDs or
runtime snapshots by default. Generated review history stays local and is ignored by Git. Only this README and
`_template/` are tracked; do not force-add generated reports or patches. `.runtime/`
is also ignored.

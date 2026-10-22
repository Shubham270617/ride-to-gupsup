# Ridge authoritative data + timer storage — proposal only

Not covered by the approved five-table layout/volunteer migration. No Ridge schema or participant records changed.

## Published snapshot fields
Preserve stable canonical rider ID and explicit reviewed aliases; immutable session identity/date; five nullable lap-point slots; nullable published improvement; completed loops; published highlight and total scores; raw durations with gaps; source workbook/sheet/snapshot/row provenance. Do not recompute historical published scores. Keep source totals even when flagged for review; adapter fails readiness on inconsistent totals/unresolved identities/duplicate rider-date, rather than guessing corrections.

Recommended separate immutable import batch/snapshot and score-record storage, with explicit review/publish pointer, not destructive replacement of old results. Date values retain calendar semantics; timing timestamps retain epoch values and Asia/Calcutta context. Schema review must decide stable identity mapping and duplicate resolution before any import. Current real sheet has later data than local sample fixtures; copying samples is not migration.

## Timer/audit prerequisites
Persist session status/mode/revision, immutable rider-session IDs, START/END events with unique session/rider/lap/action, accepted corrections and append-only audit with operator/reason/expected version. Server-authenticated authorization and transaction compare-and-swap are required. Atomic PASS writes END and next START together; recorded TESTING sessions cannot be promoted directly to LIVE. Finished sessions still allow authorized audited corrections. Preserve raw and accepted values separately.

New pure modules officialImport.js and timer.js are dry-run/state-machine foundations only. They make no remote calls and do not prove live source version or complete UI functionality. No application collection, Strava integration, credential exposure or new hosting is involved.

# Standalone timer demo and empty assignment correction

The unauthenticated `/volunteer/ridge/demo` route uses synthetic names and page-memory state only. Reload clears its changes. It imports the native timing engine but no transport, credentials, storage or database client. Session/rider creation, attendance, group/individual start, pass-through, lap finish and session close are demonstrated locally. Selecting Live does not publish anything.

The real `/volunteer/ridge` route retains authentication and assignment checks. An unassigned signed-in user now sees the four-tab shell and disabled writes, with a refresh action and assignment explanation. Only a server-verified allowlisted admin receives secondary owner links. No assignments, policy, grant, environment flag or data changes accompany this patch.

Reference was inspected read-only. Compact left heading, lavender four-tab navigation, session/date/mode/create row, rider/add row, status box and footer were compared visually. This is not complete pixel/behavior parity: external photo uploads, results retry and reference password workflows are not implemented. Local photo replacement and the observed lap-correction dialog are now implemented; password-gated advanced controls remain unverified. Owner session creation on the real standalone panel remains a secondary existing-admin route, not an inline operation. Do not present the demo as a connected operational timer or claim authenticated acceptance.

Validation: full available suite 840 passed, two existing Python environment failures, one expected failure and one todo; build/lint pass with existing warnings. Local browser verified attendance, running first lap, pass-through to lap two, and 390px viewport without document overflow. Synthetic tests cover new session/rider creation and zero fetch calls.

## Reference parity checklist (read-only inspection, 21 October 2026)

| Area | Observed reference | Demo verification / remaining gap |
| --- | --- | --- |
| Navigation/layout | Four tabs Riders, Timer, Rider Photos, Data; compact purple heading/lavender controls | Same ordering and grouped shell; desktop and 390px checked. Not a pixel-identical claim. |
| Sessions/roster | Date, Testing/Live, Create session, Add rider, Save attendance, Go to timer | Synthetic creation and attendance tested; Live label never exposes data. |
| Timing | Per-rider START and ready lap; Finish Session | Native group start, individual late arrival, pass, finish and close tested synthetically. Reference running/pass behavior not exercised to avoid real writes. |
| Data | Five rows per rider including missing laps; timestamps in IST with milliseconds; recorded/accepted duration; Status/Edit | Implemented; missing values stay blank. Native synthetic correction rules enforce ordered same-date timestamps, previous lap and adjacent-lap boundaries. |
| Edit dialog | Opened then cancelled without modifications: timestamps or duration-only, reason, Cancel, Save and update results | Demo supports both modes. Duration corrections preserve recorded timestamps; invalid input stays open. Browser recovered synthetic lap from 06:00 to 06:01 IST. |
| Photos | Profile portrait capture/gallery, replace, search, refresh; Spotlight/Achievement separate | Local PNG/JPEG/WebP up to 5 MB, search, replace and memory cleanup. No upload, persistence or automatic camera request. Camera hardware interaction not tested. |
| Results retry | Retry results update button | Disabled with explicit no-server explanation; no fake success. |
| Advanced | Password gate was observed in prior inspection; no password entered | Inner advanced controls unknown, not claimed implemented. Need owner-provided source or a redacted walkthrough of those controls to establish exact parity; no password needed in chat. |

No real reference mutation or real demo data is copied into fixtures. Operational volunteer routes still deny unassigned users and do not expose correction/photo writes. Browser test fixture files are not deployed.

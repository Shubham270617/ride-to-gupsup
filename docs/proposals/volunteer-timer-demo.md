# Standalone timer demo and empty assignment correction

The unauthenticated `/volunteer/ridge/demo` route uses synthetic names and page-memory state only. Reload clears its changes. It imports the native timing engine but no transport, credentials, storage or database client. Session/rider creation, attendance, group/individual start, pass-through, lap finish and session close are demonstrated locally. Selecting Live does not publish anything.

The real `/volunteer/ridge` route retains authentication and assignment checks. An unassigned signed-in user now sees the four-tab shell and disabled writes, with a refresh action and assignment explanation. Only a server-verified allowlisted admin receives secondary owner links. No assignments, policy, grant, environment flag or data changes accompany this patch.

Reference was inspected read-only. Compact left heading, lavender four-tab navigation, session/date/mode/create row, rider/add row, status box and footer were compared visually. This is not complete pixel/behavior parity: profile photo uploads, advanced corrections, results retry and reference password workflows are not implemented in the demo. Owner session creation on the real standalone panel remains a secondary existing-admin route, not an inline operation. Do not present the demo as a connected operational timer or claim authenticated acceptance.

Validation: full available suite 837 passed, two existing Python environment failures, one expected failure and one todo; build/lint pass with existing warnings. Local browser verified attendance, running first lap, pass-through to lap two, and 390px viewport without document overflow. Synthetic tests cover new session/rider creation and zero fetch calls.

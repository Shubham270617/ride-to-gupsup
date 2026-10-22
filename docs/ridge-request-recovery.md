# Ridge request recovery

Requests have a 20-second deadline covering session lookup, fetch and response parsing. Aborting or timing out after dispatch is uncertain; no mutation is automatically repeated. An explicit retry reuses the exact request ID, version, session ID and command.

Pending operations survive SPA navigation/remounts in tab memory. Recovery is scoped to user ID plus Supabase user.last_sign_in_at. A changed account or new login requires a fresh read and cannot replay another login's recovery. Tokens/credentials are never retained in recovery storage. Up to eight login reminders are held; command payloads expire after 30 minutes. Expired reminders require a successful current-record read and explicit user reconciliation. Clearing a reminder makes no server mutation.

Full document reload/tab close intentionally does not persist recovery; a beforeunload warning protects active pending operations. Review current records and audit after reload before entering any replacement action.

Verification: transport and UI regressions cover deadlines, late lookup/completion, cancellation, superseded reads, uncertain committed actions, remount recovery, account/login changes and expiration/reconciliation. An isolated browser fixture verified start -> navigation -> return -> explicit same-action retry -> one running lap. No real rider writes were used.

Final full suite: 790 passed; two existing Python-dependent environment failures; one expected failure; one todo. Build/lint passed with existing warnings. Ridge visual-canvas work remains separate and is not part of this change.

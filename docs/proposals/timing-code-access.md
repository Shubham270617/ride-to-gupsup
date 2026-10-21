# Inactive timing-code authentication candidate

Requested replacement: individual volunteer/session code and a distinct owner Advanced Settings code. Main website admin login remains the only code-management entry. Existing deployed account/assignment protections remain active. No real codes generated; no proposed schema, credentials, cookies or grants activated.

`api-lib/proposals/timingCodeAuth.js` is deliberately disconnected from all API routes. It provides 192-bit random codes, domain-separated HMAC storage, 256-bit opaque session tokens, 20-minute HttpOnly/Secure/SameSite=Strict cookies, same-origin POST checks, bounded expiry and command/roster scope checks. Tests use deterministic synthetic bytes only.

## Required activation review

Before this can work, implement/review a service-only durable store with protected `ridge_timing_codes`, `ridge_timing_code_sessions`, and atomic shared rate-limit counters. Store only hashes, issuer/assignment references, explicit scope, expiry/revocation and non-secret audit IDs. Issuance must recheck the existing server owner guard and the named existing assignment transactionally. Expiry cap: 24 hours; session cap: 20 minutes. Every read/write must recheck current credential, session and underlying owner/assignment validity; timing writer must repeat that check under its existing workspace lock. Advanced scope must never grant access, publish/import history, or silently expand roles.

The candidate's store methods are contracts, not implemented database transactions. They must enforce global and per-network attempt limits atomically and bind network keys only to trusted platform metadata. No caller-supplied forwarded-IP trust. Server adapters must redact cookies/code bodies from all diagnostics. Mutation request IDs, CAS, audit and uncertain-write recovery stay mandatory. Cookie path is `/` for the required __Host prefix. Revocation invalidates all sessions immediately through per-request database checks.

Exact approval needed before activation: install reviewed protected storage/functions, add a dedicated server secret, enable code exchange/session cookies, and name the existing volunteer assignments permitted for issuance. Issuance of actual codes remains a separate explicit owner action. No password or secret is needed in chat. Until that approval and end-to-end security tests, this is an inactive proposal, not a working replacement login.

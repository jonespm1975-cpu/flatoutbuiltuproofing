# Installed Supabase retry functions — read-only and safe rejection checks (2026-11-13)

Read the exact installed definitions from pg_get_functiondef:
- `internal.claim_sandbox_email_retry_v2` filters to `cs_test_%`, sandbox-test terms, pending confirmation, pending or expired lease, attempts < 5; uses `FOR UPDATE OF q SKIP LOCKED`; updates lease and attempt counter atomically.
- `internal.finish_sandbox_email_retry_v3` requires matching unexpired lease token, sandbox-test terms and pending confirmation; accepted sends require a nonempty provider message ID; updates queue and confirmation in one function call.

Executed three harmless rejection cases against the installed finish function, all returned false:
1. Invalid session and null token: false.
2. Nonexistent test session with accepted=true but missing provider ID: false.
3. Nonexistent test session with false acceptance and unknown lease token: false.

The existing queue record `accepted`, `attempts=0`, `provider_message_id=null` could not have been produced by the current finish function's accepted path, because the claim function increments attempts and the finish function requires a nonempty provider ID. This is an inference from installed code, not proof of how the legacy record was created.

These are NOT concurrency tests. No two simultaneous persistent database connections were available; do not mark concurrency passed. No email provider confirmation, payment, or customer record modification occurred. Resend event verification requires provider-side access.

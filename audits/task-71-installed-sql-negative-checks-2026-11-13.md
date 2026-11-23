# Task 71 — installed Supabase function verification (2026-11-13 UTC)

## Read-only inspection
Fetched installed PostgreSQL function definitions via pg_get_functiondef for:
- public.claim_test_course_confirmation_email(text)
- public.finish_test_course_confirmation_email(text,uuid,boolean,text,text)
- internal.finish_sandbox_email_retry_v3(text,uuid,boolean,text,text)

Installed claim function uses SELECT ... FOR UPDATE OF q SKIP LOCKED followed by UPDATE ... RETURNING lease_token, attempts; requires cs_test_ prefix, sandbox-test terms, pending confirmation, attempts < 5, and due pending or expired leased queue state. Installed finish function rejects invalid tokens, expired leases, non-sandbox IDs, and accepted finish with empty provider ID; failed send uses exponential backoff and returns queue to pending or failed.

## Executed production database negative probes
One SQL transaction BEGIN ... ROLLBACK (no persistent changes), using JSON boolean assertions:
- non_sandbox_claim_rejected = true
- missing_sandbox_claim_rejected = true
- invalid_finish_rejected = true
- empty_provider_id_rejected = true

These are genuine calls to installed Supabase SQL functions, but NOT two-connection concurrency testing. They do not test a valid claim or provider delivery.

## Remaining blockers
- Independent review of Task 69 PostgreSQL Actions job logs and SQL parity. The GitHub screenshot shows green but detailed job logs have not been retrieved.
- Installed DB valid-claim concurrency with two independent sessions not yet performed; avoid touching existing customer data.
- Task 70 mocked webhook tests passed (GitHub Actions run 43344334642, job 131619898228).
- Existing sandbox email record marked sent while queue accepted with attempts=0 and missing provider ID; reconcile with Resend before live sending.
- Provider timeout and expired-lease manual reconciliation policy review.

## Deployment decision
HOLD. Do not merge PR #5 or deploy sandbox webhook until all tests and reconciliation pass. No Stripe/Resend sends or Supabase Free plan changes.

# Task 162 — Provider ID integration design and safety gate (2026-11-13)

## Actual installed SQL review
Read pg_get_functiondef for internal.claim_sandbox_email_retry_v2 and internal.finish_sandbox_email_retry_v3 on project fhyhshakmvqwzdyannec. Claim uses FOR UPDATE OF q SKIP LOCKED, lease token, 5 minute expiry, max 5 attempts, and sandbox receipt pending predicate. Finish validates cs_test_ prefix, token, accepted provider ID nonblank, matching unexpired lease and pending receipt; locks queue and receipt and atomically updates provider_message_id, queue status and receipt status.

**Existing finish function already supports provider ID persistence.** Avoid duplicating schema/function or directly updating receipt outside this mechanism.

## Integration contract (not deployed)
1. Only sandbox worker holding a genuine claim token from claim_sandbox_email_retry_v2 may send email. Never send from an unrelated webhook execution path concurrently.
2. Before calling Resend, check that the record is a pending sandbox confirmation with an active claim; use a stable idempotency key based on session ID.
3. After successful Resend HTTP response, parse JSON and validate a nonempty provider id. Call finish_sandbox_email_retry_v3(p_session,p_token,true,p_provider_id,null). Treat false as a reconciliation incident, not as permission to resend.
4. For explicit provider rejection, call finish(...false,NULL,redacted_error), but for network timeout or uncertain acceptance do NOT automatically retry without first reconciling the idempotency key/provider status; avoid duplicate delivery.
5. Existing accepted/sent records must be skipped, even if provider_message_id is null. No historical backfill without verified provider evidence.
6. Current stripe-test-webhook v25 sends Resend directly and marks purchase_confirmations sent without storing provider ID. It must NOT be changed to invoke finish_v3 unless the queue is first genuinely leased; a bare call would correctly return false. Refactor sending ownership to one sandbox-only queue worker after end-to-end tests, not a quick patch to live webhook.

## Required verification before deployment
- Test with synthetic sandbox rows in disposable DB clone; valid token, stale token, lease expiry, duplicate completion, conflicting IDs, provider HTTP errors, ambiguous timeout.
- Two independent PostgreSQL sessions to verify SKIP LOCKED single winner and transaction atomicity.
- Stub Resend API (no outbound email) and verify 200+valid id vs 200+missing id and non-2xx.
- Validate no changes to existing customer records, entitlements, subscriptions or live billing. No changes were applied in this task.

## Outcome
Integration design prepared; installed SQL read and reconciled; no production code deployed and no real concurrency test claimed.

# Task 64 — True two-connection sandbox email-claim test protocol
Date: 2026-11-13 UTC
Status: TEST PROCEDURE PREPARED; NOT EXECUTED

## Goal
Verify two independent PostgreSQL connections cannot both claim one sandbox confirmation. This is necessary before deploying the proposed Task 59 single-session claim RPC or enabling sandbox email sending.

## Prerequisites
Use an isolated staging database or a disposable sandbox fixture, not an actual customer record. Apply the proposed RPC only in staging. Create a fixture with a cs_test_ prefix, sandbox-test terms, pending receipt and due pending queue row. Confirm no external email/Stripe calls are enabled. Use separate PostgreSQL connections with explicit transactions.

## Session A
BEGIN;
SELECT * FROM public.claim_sandbox_confirmation_for_session('<disposable_cs_test_session>');
-- Expect exactly one claim with token and attempt=1.
-- Keep the transaction open, holding the row lock.

## Session B (while A is open)
BEGIN;
SET LOCAL lock_timeout = '2s';
SELECT * FROM public.claim_sandbox_confirmation_for_session('<same_disposable_cs_test_session>');
-- Expect zero rows immediately because FOR UPDATE SKIP LOCKED skips A's lock.
ROLLBACK;

## Session A cleanup
ROLLBACK;

## Repeat after A commits
For a disposable fixture only, repeat A and COMMIT; B must then return zero rows while lease is active. After lease expiry, B may claim once with a new token and incremented attempt. Reject the original token with finish_sandbox_email_retry_v3. Roll back/reset only the disposable fixture.

## Required additional integration checks
- Two concurrent signed sandbox webhook deliveries must produce no more than one provider dispatch.
- Webhook and future worker must use the same single-session claim RPC and finish contract.
- Provider accepted but DB finish failed: preserve stable provider idempotency key and explicitly document recovery ambiguity.
- Five failed attempts: queue failed and alert/recovery plan exists.
- No duplicate entitlements; existing subscription cancellation preserved.

## Current evidence
Supabase read-only check found one accepted sandbox queue record (attempts=0) linked to receipt marked sent. No dblink/pg_background/postgres_fdw extension was returned by the extension query. There is no evidence of two independent test connections having been run in Task 64.

## Deployment gate
BLOCKED pending real multi-connection and webhook integration tests. Do not activate sender or scheduler. Do not send emails or create payments/Checkout sessions. Preserve live billing, homepage, customer entitlements, subscription cancellation and Supabase Free plan.

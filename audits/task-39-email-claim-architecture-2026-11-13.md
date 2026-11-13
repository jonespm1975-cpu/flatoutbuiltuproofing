# Task 39 — Email claim architecture and safety review
Date: 2026-11-13 UTC
Status: AUDIT COMPLETE; EMAIL LOCK DEPLOYMENT DEFERRED pending executable integration verification.

## Deployed functions inspected
- stripe-test-webhook v25: direct Resend send after checking confirmation_email_status; uses stable Idempotency-Key but no atomic email claim. Concurrent webhooks can attempt two sends.
- purchase-email-retry-worker v10: authenticated service-role dry-run only, claiming_enabled=false, sending_enabled=false, scheduler_enabled=false.
- live-purchase-email-delivery-worker v1: separately gated, uses claim_live_purchase_email_retry and finish_live_purchase_email_retry; NOT changed.

## Database contracts
Existing internal.claim_sandbox_email_retry_v2 uses FOR UPDATE SKIP LOCKED, per-session lease_token UUID, 5-minute lease and attempts limit 5. Existing internal.finish_sandbox_email_retry_v3 uses token and row locks and updates queue + receipt status atomically. Existing sandbox queue has one row. Existing receipt count one. No new schema required in principle.
Critical integration issue: webhook directly sends while retry queue claims are independent. Both must use the same atomic claim contract to ensure mutual exclusion. Existing claim function is batch-oriented and lives in internal schema; direct calling from Supabase Edge Functions may require a narrowly scoped public service-role-only wrapper. Worker currently dry-run and cannot send; simply disabling direct webhook sends would silently stop sandbox confirmations.

## Safe proposed implementation (NOT DEPLOYED)
1. Create service-role-only SECURITY DEFINER RPC to atomically claim one eligible sandbox receipt/queue row by session ID, returning opaque lease token. Verify cs_test_ prefix, sandbox-test terms, pending receipt, due queue, max attempts, and lock queue row with SKIP LOCKED.
2. Modify sandbox webhook to call claim before Resend. If already leased/accepted, return 200 without sending. On provider acceptance call existing finish_sandbox_email_retry_v3 with token and provider ID; on failure finish with retryable failure.
3. Use same claim/finish contract in future sandbox worker (currently dry-run); do not enable worker until separate test and approval.
4. Test duplicate concurrent webhook calls, stale token, expired lease, provider accepted but finish failed, retry backoff and no duplicate provider dispatch. Preserve provider idempotency key as second layer.
5. Note unavoidable ambiguity: if provider accepted but function dies before finish, lease expires and retry can attempt again; stable provider idempotency key mitigates but exact-once inbox delivery cannot be guaranteed solely by DB lock.

## Read-only verification
sandbox_email_retry_queue rows=1; purchase_confirmations rows=1; course_access rows=2; course_checkout_reservations rows=0; membership cancellation bool_and(cancel_at_period_end)=true.

## Change record
No SQL migrations, Edge Function deployments, Stripe Checkout sessions/payments, emails, live billing, subscriptions, homepage or Supabase plan changes. Safe implementation deferred because full concurrent integration tests have not run.

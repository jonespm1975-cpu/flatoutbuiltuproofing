# Task 169 — live email queue structural checks

Date: 2026-11-13
Scope: five read-only SQL checks executed against Supabase project fhyhshakmvqwzdyannec. No data mutations, email sends, checkout sessions, payments, worker calls, or deployments.

## Verified SQL checks
1. Primary key/unique session identity on internal.live_purchase_email_outbox: PASS.
2. enqueue_live_purchase_confirmation_email_on_receipt trigger installed and enabled: PASS.
3. public.claim_live_purchase_email_retry uses FOR UPDATE SKIP LOCKED: PASS.
4. public.finish_live_purchase_email_retry requires matching q.lease_token=p_token: PASS.
5. No currently active live outbox leases: PASS.

## Limitations
These are static schema/source and current-state checks, NOT an actual simultaneous two-database-connection race test. The available SQL connector does not guarantee two independently held connections/transactions. No genuine concurrent test was performed. Resend idempotency retention and provider-accepted/database-finalisation-failed fault injection are also unverified.

## Remaining release gates
- Isolated two-session PostgreSQL concurrency test in disposable database environment.
- Fault injection for provider accepted / database update failed and provider reconciliation.
- Resolve duplicate sender architecture: live stripe-webhook directly sends emails and live delivery worker also exists.
- Verify production email flags, payment settings, legal consent and cancellation, and obtain production change approval.

Preserve live billing, entitlements, subscriptions, homepage and Supabase Free plan.

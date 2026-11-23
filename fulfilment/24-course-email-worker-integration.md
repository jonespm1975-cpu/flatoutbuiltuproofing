# Twenty-four-course sandbox email delivery: implementation contract

Staged: 22 November 2026. **Not deployed**. Existing live email and beginner-course fulfilment unchanged.

## Implemented staging modules
- `fulfilment/course-confirmation-routing.mjs` creates a trusted per-course name and idempotency key `course-confirmation-<cs_test_session>` from server-owned catalogue and verified paid receipt.
- `fulfilment/sandbox-confirmation-worker.mjs` consumes an **atomic** claim batch. Each claim must be exclusive for (Stripe session ID, lease token); it sends only after verifying course ID, immutable 999p payment, GBP, user ID and recipient retrieved by trusted service-side identity lookup.
- `fulfilment/sandbox-confirmation-worker.test.mjs` tests all 24 course-specific messages, provider-rejection recording, missing config and expired-lease finish failure. No actual provider requests or emails are made.

## Required real adapters before enabling
1. **Atomic claim**: PostgreSQL transaction that claims at most two due jobs, `FOR UPDATE SKIP LOCKED`, with 60-second lease, monotonic attempt count and unique `stripe_checkout_session_id`. Expired leases reappear after backoff. Concurrent workers cannot own same active lease.
2. **Receipt lookup**: service-only read of `purchase_confirmations` for the claimed sandbox session. A successful Stripe redirect is *never* sufficient.
3. **Recipient**: verified Auth record for that `user_id` (not email or name supplied in browser metadata). Reconcile missing or unverified recipients.
4. **Provider send**: sandbox-only Resend sender with deduplication/idempotency support. Provider *acceptance* is distinct from *delivery*. Do not retry a prior accepted request without reconciling provider state.
5. **Atomic finish**: compare-and-swap on `(session_id,claim_token)`; accepted only after provider confirms acceptance. Permanent error/expiration needs bounded retry and operator alert.
6. **Access fulfilment**: course entitlement must be granted according to the approved paid-event policy, independent of provider email outage. Current live finalizer's historical coupling to email delivery must not be silently replicated.
7. **Production hold**: no new cron worker, SMTP key, webhook, release flag or subscription setting changed until isolated signed sandbox test + actual email/DB evidence.

## Verified checks / blockers
- Read-only: existing live `live-purchase-email-delivery-worker` v7 is fixed to `beginner-training-course`; sandbox retry worker v14 currently reports a dry run. Neither has been altered.
- Unverified: real atomic claim and finish functions for all 24 courses, genuine two-connection DB email lease test, Resend accepted/delivered receipts, paid access under email failure.
- The 24 paid lessons remain owner-draft-approved only and not for sale.

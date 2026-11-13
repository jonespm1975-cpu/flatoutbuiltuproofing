# Task 170 — single-sender correction and production hold
Date: 2026-11-13

## Verified
- Deployed live stripe-webhook v31 sends directly to Resend after entitlement grant and confirmation upsert, returns 503 on provider or confirmation-status write failure.
- Deployed live-purchase-email-delivery-worker v1 is a second possible sender when its two operator flags are enabled. Actual flag values not inspected.
- Live outbox enqueue trigger enabled, one-row-per-session PK, lease token and provider-acceptance constraints installed.
- RLS enabled on public.purchase_confirmations and internal.live_purchase_email_outbox; detailed policies/role access not audited here.
- Existing membership launch hold documents separate £1.99 recurring billing gates. Do not infer live membership activation from sandbox price.

## Recommended correction (design only)
1. Preserve current Stripe signature verification, £9.99 allowlisted price, authenticated user mapping, consent validation, and idempotent entitlement upsert.
2. Within a database transaction, upsert purchase receipt and durable email outbox record, with one unique session ID. Acknowledge Stripe after durable grant/outbox success; do not call Resend inside the webhook.
3. Restrict all sends to one separately authorised worker. Require exact service-role auth, double operator flags, atomic lease and unique session.
4. For uncertain provider acceptance, park/reconcile job against Resend before any retry; do not rely solely on time-limited provider idempotency.
5. Implement a migration plan compatible with already-sent receipts and any existing outbox jobs, avoiding duplicate sends during cutover. Ensure fail-closed rollback and monitor Stripe delivery acknowledgements.
6. Run two independent PostgreSQL sessions on disposable fixtures plus injected provider-acceptance/database-failure cases before deployment.
7. Keep £1.99 membership disabled until separate checkout, cancellation, invoice events, tax-inclusive total and legal terms pass sandbox E2E tests.

## Not completed
No live code fix, live environment flag read, provider idempotency retention verification, actual two-session test, or production deployment. No live customer payments or emails were created. Explicit approval required before production-impacting activation.

# Live payment activation gate — 12 November 2026

**Status: NOT VERIFIED / NOT ACTIVATED.** User explicitly requested activation, but no activation flag was changed because the current live payment flow has unresolved risks.

## Verified by direct source inspection
- Supabase `stripe-live-checkout` v7 ACTIVE: requires `STRIPE_LIVE_CHECKOUT_ENABLED=true`, a live Stripe secret, signed-in non-anonymous user, three explicit consent booleans; creates £9.99 checkout for `beginner-training-course`.
- `stripe-webhook` v26 ACTIVE: requires `COURSE_UNLOCK_ENABLED=true`, validates Stripe signature, live event, payment, metadata, customer and price, then upserts `course_access` and `purchase_confirmations`.
- `paid-lesson-content` v10 ACTIVE: authenticates user and checks `course_access` before returning lesson.
- `purchase-info.html` currently says purchases are not open, and checkout control is disabled.
- Live webhook sends Resend confirmation synchronously and returns HTTP 503 if email provider fails or email status cannot be updated **after access may already have been granted**. Stripe retries can then occur. Need decouple email from webhook acknowledgement and independently retry confirmation.
- Stripe connected-account listing failed with `link_id must identify an eligible linked account`. Therefore live Stripe settings, account readiness and webhook delivery status were not verified.
- Supabase Edge Function environment secret values/activation flags cannot be read through the available connector. Do not infer current flags.

## Additional verification and tests (12 November 2026)
- Inspected deployed `stripe-webhook` v26, `stripe-test-webhook` v18 and `purchase-email-retry-worker` v5 directly; live webhook still synchronously sends email and returns 503 on email failure.
- Sandbox retry completion function `internal.finish_sandbox_email_retry_v3` has been deployed and rollback-tested; sandbox worker is still read-only, and no live outbox/processor is active.
- Added `tests/email-retry-worker-smoke.mjs` to check 401 rejection and authenticated disabled-state contract. **Test script committed, not yet executed against endpoint**; service-role credentials must only be supplied via protected local/CI environment.
- No evidence of live Stripe charge or verified email delivery. This gate remains CLOSED.

## Before switching on
1. Fix webhook to acknowledge successful entitlement/receipt writes independently of email provider outages, with durable email retry; test signed sandbox event, duplicates, failure and retry.
2. Verify `STRIPE_LESSON_COURSE_ID` matches `beginner-training-course`, live secret/price/webhook signing secret, `COURSE_UNLOCK_ENABLED`, and live Stripe webhook delivery.
3. Make public purchase page functional: signed-in session, affirmative unchecked consents, secure checkout call, errors, legal links and post-payment access.
4. Verify Resend sender domain SPF/DKIM or reliable alternate durable confirmation; confirm legal consent wording and consumer information.
5. Perform end-to-end sandbox checkout/entitlement/receipt test without charging a card; verify access controls and a rollback/disable plan.
6. Only then explicitly switch live flags on, check checkout availability, and monitor first real purchases without initiating a charge.

**No live activation, real charge, email send, DNS change, or customer-data modification performed in this review.**

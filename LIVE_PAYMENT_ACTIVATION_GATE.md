# Live payment activation gate — 12 November 2026

**Status: NOT VERIFIED / NOT ACTIVATED.** User explicitly requested activation, but no activation flag was changed because the current live payment flow has unresolved risks.

## Verified by direct source inspection
- Supabase `stripe-live-checkout` v7 ACTIVE: requires `STRIPE_LIVE_CHECKOUT_ENABLED=true`, a live Stripe secret, signed-in non-anonymous user, three explicit consent booleans; creates £9.99 checkout for `beginner-training-course`.
- `stripe-webhook` v26 ACTIVE: requires `COURSE_UNLOCK_ENABLED=true`, validates Stripe signature, live event, payment, metadata, customer and price, then upserts `course_access` and `purchase_confirmations`.
- `paid-lesson-content` v10 ACTIVE: authenticates user and checks `course_access` before returning lesson.
- `purchase-info.html` currently says purchases are not open, and checkout control is disabled.
- Live webhook sends Resend confirmation synchronously and returns HTTP 503 if email provider fails or email status cannot be updated **after access may already have been granted**. Stripe retries can then occur. Need to decouple email from webhook acknowledgement and independently retry confirmation.
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

---

# Current verification — 21 November 2026
**Current decision: NO-GO. This section supersedes older status notes above where deployed versions or Stripe state have changed.**

## Verified through Supabase, Stripe and GitHub
- Supabase project is `ACTIVE_HEALTHY`. Deployed functions are active: `stripe-live-checkout` v12, `stripe-webhook` v32 and `live-purchase-email-delivery-worker` v2. “Active” means deployed; it does not prove that their operator flags are enabled.
- The live checkout function requires `STRIPE_LIVE_CHECKOUT_ENABLED=true`, a live Stripe secret, an authenticated non-anonymous Supabase user, and all three explicit consent fields. It creates a one-time £9.99 Checkout Session for the beginner course.
- The live webhook requires `COURSE_UNLOCK_ENABLED=true`; it validates the paid live session, amount, price, user/course mapping and consent, rejects Payment Link sessions, writes course access and a purchase receipt, and queues confirmation email work. The separate email worker also has two independent enable flags.
- The active Stripe price for the beginner course is £9.99 GBP one-time, with inclusive tax behavior.
- The live Payment Link is inactive. The current live Stripe account has 14 Checkout Sessions; all 14 are expired and unpaid, all originated from that Payment Link, and none are direct Checkout Sessions. No paid session or successful charge was found. The recorded return URL on those sessions was `https://stripe.com`.
- GitHub `purchase-info.html` still says purchases are closed. Its immediate-delivery consent checkbox and checkout button are disabled, so the public purchase flow is not ready.
- The Supabase screenshots show secret names only; secret values and live-flag values remain unverified. The Supabase connector exposes no secret read/write operation. No secrets or payment settings were changed in this review.

- Supabase's current security advisor also reports leaked-password protection is disabled; its RLS-without-policy notices require review to confirm the deny-by-default setup is intentional.
- The inactive Payment Link has Stripe automatic tax enabled; its expired sessions show tax status `requires_location_inputs`. Confirm the tax setup and £9.99 price treatment before activation. No tax setting was changed.

## Remaining launch gates
1. Implement the signed-in customer purchase and consent flow, then provide the requested visual preview before publishing it.
2. Verify the production email sender identity, outbox worker configuration and schedule without exposing keys.
3. Complete a sandbox end-to-end checkout, entitlement, receipt and email check with no real charge.
4. Confirm the production secret values and flags through Supabase’s protected secrets UI.
5. Recheck tax, contract wording, consumer information, and refund/cancellation handling before launch.
6. Only after all gates pass, enable the live checkout and course-unlock flags and monitor the first customer transactions.

**No live checkout was activated and no customer payment was created during the 21 November 2026 review.**

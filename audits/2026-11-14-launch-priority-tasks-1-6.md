# Flat Out Built-Up Roofing — launch priority tasks 1–6

**Date:** 14 November 2026  
**Scope:** Safe review and sandbox-only correction. No customer charges, test checkouts, email sends, live payment-setting changes, subscription changes, or legal-page publication.

## 1. Sandbox Stripe events and access reconciliation

- Stripe API readback confirms two test-mode `checkout.session.completed` events remain at `pending_webhooks=1`:
  - `evt_1Ub6xTKS41qhUQTKCAsjwHU2` is a £1.99 subscription-mode Checkout Session.
  - `evt_1UaR5FKS41qhUQTK9ekgoE4b` is a one-time course Session with £9.99 subtotal and £11.99 test total, including £2.00 test tax.
- The two enabled sandbox endpoints show that **both Checkout Session events are subscribed only to `stripe-test-webhook`**. `membership-test-webhook` subscribes to subscription and invoice lifecycle events, not `checkout.session.completed`. Therefore the subscription-mode Checkout event must be acknowledged by the course endpoint's explicit “ignore subscription mode” branch; it should not be retried to the membership endpoint.
- The course receipt for the £9.99 Session is present as `pending`; its sandbox queue row is `pending`, attempts 0, with no provider message ID. Existing course access is present.
- Source review found an undefined `allowedPrice` reference in `stripe-test-webhook` v28's required-configuration check; the function defines `allowedPrices`. Removed the invalid reference and deployed sandbox-only version **v29**. Readback confirms the corrected check, test-mode guard, subscription ignore branch and no Resend call.
- Stripe API has no event-redelivery operation here. The Dashboard browser is at the Stripe passkey sign-in page. Both events remain pending until a signed delivery retry can be made in Test Mode to the subscribed course endpoint and its HTTP response confirmed. No event replay was attempted.

## 2. Purchase-email provider reconciliation

- The course purchase receipt and queue remain pending, with no provider message ID.
- Gmail search returned no matching purchase-confirmation message.
- No Resend provider/status connector is available in this session. Provider acceptance and inbox delivery remain unverified; no resend was attempted.

## 3. Live email and webhook separation

- Live `stripe-webhook` v31 still sends the confirmation inline after writing access and the receipt. A send failure can return 503 after access has already been granted.
- The database trigger `enqueue_live_purchase_confirmation_email_on_receipt` exists and writes eligible live receipts to the internal outbox. The outbox currently has zero rows; the older “no trigger” table comment is stale.
- The live delivery worker requires two explicit environment flags and a service-role authorization header. The effective secret values are not exposed through the available connector. No `pg_cron` extension is installed, and the worker has no verified schedule or invocation path.
- No live webhook or worker changes were deployed. A live cutover remains blocked until a protected worker schedule/invocation is available and verified.

## 4. Live checkout and price review

- The live one-time £9.99 Price is active, GBP, and explicitly `inclusive`; it is not a recurring price.
- The live Checkout Session endpoint is enabled for completed/async-success events and targets `stripe-webhook`.
- The deployed checkout function requires `STRIPE_LIVE_CHECKOUT_ENABLED=true`, authentication and affirmative consent fields. Its actual environment flag value cannot be read through the available connector, so effective checkout state is unverified. No checkout was invoked.
- Stripe Tax settings report active, with default tax behavior `exclusive`, a GB head-office country but no populated postal address, and no tax registrations. The £9.99 Price overrides the default with `inclusive`; the current Checkout function does not enable automatic tax. No tax settings were changed. The tax setup and obligations need qualified review before sales, especially for sales outside the UK.

## 5. Test-mode customer journey

- Current deployed code requires an authenticated account and consent values before creating a live Checkout Session; test-mode flow has signed-webhook verification and a test-only unlock flag.
- The already-paid sandbox course Session has access, a pending receipt and a pending queue row. This does not verify current end-to-end runtime delivery for v29.
- No new Checkout Session or test charge was created. Signed webhook, unauthenticated/unpaid access denial, consent UI, mobile flow, cancellation and refund tests remain outstanding. Previous owner-confirmed success of a protected lesson is historical, not a fresh test in this review.

## 6. Legal and customer-facing documents

- `terms.html` and `refunds.html` are still marked **DRAFT / owner review required**.
- `privacy.html` still contains unresolved retention-period placeholders and asks the owner to confirm actual providers, lawful bases, marketing/cookie practices and age arrangements.
- No legal pages were published or edited. These need accurate owner-confirmed data practices and final consumer/privacy review before commercial launch.

## Current handoffs

1. Sign in to Stripe Dashboard with the passkey on the browser session, then retry each pending Test Mode Checkout event only to `stripe-test-webhook`; inspect the endpoint response. The subscription event should be ignored with HTTP 200 by that endpoint.
2. Connect or open Resend so the existing pending sandbox message can be reconciled from provider events before any resend.
3. Confirm actual customer-data retention, cookie/marketing behavior and age policy for the privacy notice, and obtain final legal/tax review.
4. Keep live checkout and membership launch on hold until the above checks pass and the owner explicitly approves live billing.

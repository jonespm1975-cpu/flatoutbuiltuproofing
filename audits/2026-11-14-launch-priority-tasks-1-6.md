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

## Follow-up verification — 14 November 2026, 19:21 UTC

- Re-read active Supabase functions: `stripe-webhook` v31, `stripe-test-webhook` v29, sandbox retry worker v10, and live delivery worker v1. The sandbox retry worker is a read-only dry run: sending, claiming and scheduling are disabled. The live delivery worker requires both `LIVE_PURCHASE_EMAIL_WORKER_ENABLED` and `LIVE_PURCHASE_EMAIL_SENDING_ENABLED`, plus service-role authorization; its code reports that scheduling is disabled. No worker was invoked.
- The live webhook source still performs inline Resend delivery after saving course access and the receipt. No live code was changed because no secured invocation schedule for the separate worker has been verified.
- Supabase's last-24-hour function-edge log query returned one Stripe POST to `membership-test-webhook` at 00:04:30 UTC with HTTP 200. It contained no event ID, so it cannot be matched to either Checkout event above and does not establish their status.
- Latest security advisor read reports leaked-password protection disabled and five RLS-enabled tables with no policies. The no-policy findings are `internal.live_purchase_email_outbox`, `internal.membership_test_checkout_leases`, `public.course_checkout_reservations`, `public.purchase_confirmations`, and `public.sandbox_email_retry_queue`. These appear designed for server-only access; no access policy was changed. The Supabase health advisor returned no findings. Security remediation remains an owner-reviewed task because enabling leaked-password protection may affect sign-up behavior.
- Stripe Dashboard still requires passkey sign-in. This session cannot retry events from the available Stripe API connector. Current event states have not been freshly re-read during this follow-up.

## Current handoffs

1. Sign in to Stripe Dashboard with the passkey on the open browser session. Then retry each pending Test Mode Checkout event only to `stripe-test-webhook` and inspect the endpoint response. The subscription-mode Checkout event should be ignored with HTTP 200 by that endpoint.
2. Connect or open Resend so the existing pending sandbox message can be reconciled from provider events before any resend.
3. Confirm actual customer-data retention, cookie/marketing behavior and age policy for the privacy notice, and obtain final legal/tax review.
4. Keep live checkout and membership launch on hold until the above checks pass and the owner explicitly approves live billing.


## Fresh live email cutover review — 14 November 2026

- Read back deployed `stripe-webhook` **v31** and `live-purchase-email-delivery-worker` **v1**. The live webhook grants course access and records the receipt, then calls Resend inline; provider/configuration failure can still return HTTP 503 after access has been granted.
- Worker v1 requires the exact service-role bearer authorization and **both** `LIVE_PURCHASE_EMAIL_WORKER_ENABLED=true` and `LIVE_PURCHASE_EMAIL_SENDING_ENABLED=true`. It reports scheduling disabled in its response. I did not invoke it or inspect secret values.
- Read-only database checks found **zero** live outbox rows, **zero** pending live receipts, `pg_cron` not installed, and no `cron.job` relation. Recent function-edge log query returned no matching live webhook/worker/audit calls; this is not a runtime delivery test.
- Cutover remains blocked: no verified protected invocation schedule exists, and changing the webhook’s acknowledgement behavior without one could strand confirmations. No live code, secrets, settings, email, payments, or database rows were changed.


## Fresh live Checkout and price readback — 14 November 2026

- Stripe Live lists an enabled `stripe-webhook` endpoint subscribed to `checkout.session.completed` and `checkout.session.async_payment_succeeded`, targeting the live webhook.
- `stripe-live-checkout` v12 requires authentication and explicit terms/immediate-access/cancellation consent, and references the intended active one-time GBP 9.99 Price `price_1UaRJvKeIprRDTKxKDawW6ZG` with inclusive tax behavior. The actual `STRIPE_LIVE_CHECKOUT_ENABLED` secret value is not visible through the connected tools, so effective live checkout availability remains unverified. No Checkout Session was created.
- Stripe lists a second active one-time GBP 9.99 Price for the same product with `tax_behavior=unspecified`. It is not the Price referenced by the current checkout source. No Price was changed or deactivated.
- Live Stripe Tax settings report `status=active`, default tax behavior `exclusive`, and default tax code `txcd_20060258`; the returned GB head-office address has no postal code, and the account has no tax registrations. The checkout's referenced Price is inclusive, so it overrides the default behavior. Tax settings and registrations were not changed; owner/qualified tax review remains necessary before launch.
- No live payment, Checkout Session, Price or tax setting was changed.

## Fresh test-mode customer journey source review — 14 November 2026

- Read deployed stripe-test-checkout v24: authenticated non-anonymous account and all three explicit consent values are required; it reserves idempotently, only creates a cs_test_ Session, and avoids replacing a Session whose result is uncertain.
- Read deployed stripe-test-webhook v29: verifies Stripe signatures, rejects live events, explicitly acknowledges subscription-mode Checkout Sessions without treating them as course purchases, and queues eligible course receipts without calling Resend.
- Read deployed paid-lesson-content v16, paid-course-media-link v1, and repository members.html: production lesson text, private media links, and My Learning course listings all require cs_live_ grants. A cs_test_ grant deliberately does not unlock production paid content. A separate sandbox lesson-content route was not found in the reviewed page/source.
- Read-only database counts remain 2 course access rows and 2 sandbox receipts; one sandbox receipt and one actionable email queue row remain pending. These counts do not establish provider delivery or successful current-version signed-webhook processing.
- No runtime tests, Stripe retries, checkout creation, email sends, access changes, or live configuration changes were performed. A separate non-production demonstration flow is needed to prove sandbox-paid access without weakening the live-only content gate. Resend provider status remains unverified; a Resend connector is not exposed among the available tools in this session.

## Fresh sandbox email reconciliation — 14 November 2026

- Read-only Supabase join of sandbox email queue and purchase confirmations returned two records. The newer course receipt is pending; its queue row is pending with 0 attempts, no lease, no provider message ID, no sent timestamp, and no stored error. Its next-attempt time has passed, but this alone does not establish a provider failure or authorize sending.
- The older receipt is marked sent in Supabase and its queue row accepted with 0 attempts; it has no provider message ID. Database status alone cannot prove inbox delivery.
- Plugin discovery for Resend returned no Resend connector, and no Resend tool is exposed in this session. Provider delivery/status therefore remains unverified; no email was sent or resent.
- No database rows or retry state were changed. Resume once a Resend provider-status connection is available, inspect existing provider events first, and only then decide whether a resend is appropriate.

## Fresh Test Mode Stripe event readback — 14 November 2026

- Read event evt_1Ub6xTKS41qhUQTKCAsjwHU2 from the Test Mode Stripe account. It remains at pending_webhooks=1 and is a completed, paid GBP 1.99 subscription-mode Checkout Session. It is not a one-time £9.99 course purchase.
- The supplied Workbench screenshot shows the earlier delivery to stripe-test-webhook returned HTTP 422, response “Checkout mismatch.” That matches the old course-only validation rejecting a subscription Session. Current deployed stripe-test-webhook v29 now returns HTTP 200 for signed subscription-mode Checkout events and does not grant course access on that branch.
- Current 24-hour Supabase function-edge logs contain no stripe-test-webhook or membership-test-webhook requests, so the new branch has not been runtime-confirmed for this event. No retry was made.
- The Stripe API read interface exposes event retrieval but no event-redelivery operation. Dashboard access was attempted; after passkey selection, the browser sign-in flow crossed to accounts.google.com. Automatic approval review rejected observation of that separate personal-auth origin because the Stripe task did not authorize Google-account access. No further browser interaction or sign-in workaround was attempted.
- Next verification remains a single Dashboard resend to stripe-test-webhook only, followed by checking for HTTP 200 and confirming no course grant was created. Do not send this subscription Checkout event to membership-test-webhook; the current routing and course endpoint subscription-ignore branch are the verified intended path.

## Supabase reconciliation for sandbox membership Checkout — 14 November 2026

- Matched the subscription ID embedded in the pending Stripe Test Mode Checkout event to one `public.membership_subscriptions` row using read-only SQL.
- Supabase records the subscription as `active`, `livemode=false`, on the expected £1.99 test price, with `cancel_at_period_end=true`; its current period ends 12 December 2026 at 22:59 UTC. The row's `last_stripe_event_created` is later than the Checkout event timestamp, consistent with subsequent membership lifecycle processing.
- This confirms the test subscription exists and its cancellation is scheduled, but it does not acknowledge the still-pending `checkout.session.completed` delivery to `stripe-test-webhook`. No subscription or course-access record was modified.


## Cross-plugin legal and purchase-readiness review — 14 November 2026

- Re-read `terms.html`, `refunds.html`, `privacy.html`, `purchase-info.html`, and `cookies.html` from the repository. All five still contain draft/warning or disabled-checkout language. No legal page was published or changed.
- The customer-facing purchase preview remains £9.99 per lesson, but checkout is explicitly unavailable and its immediate-digital-supply consent control is disabled. This agrees with the earlier sandbox-only/launch-hold record; it is not a live checkout confirmation.
- Privacy notice retains unresolved owner decisions for data retention, actual processors and transfer safeguards, lawful bases, marketing/cookie practices, age arrangements, and security processes. Cookie notice still requires the actual cookie/vendor inventory and consent controls. Terms/refunds still require final operational, accessibility, delivery and consumer-law review.
- Google Drive search returned no project legal/purchase documents to reconcile. Sites listed no Sites projects for this account; the website is tracked in this GitHub Pages repository, so no Site deployment was created or changed.
- Gmail searches found no purchase-confirmation or Resend delivery/status message. The only Resend-origin result was the account welcome email; this does not establish provider acceptance or inbox delivery. No email was sent.
- Stripe account listing confirms separate Live and Test Mode accounts are available. No Stripe settings or events were changed or retried.
- This was a read-only review. No website pages, deployments, payment settings, subscriptions, emails or database records were changed.

### Remaining owner / provider inputs

1. Confirm real retention periods and deletion processes for accounts, enquiries/submissions, transaction records and security logs.
2. Confirm which providers/features are actually active (including analytics, advertising, marketing and cookies), their data locations/transfers, learner age policy and security practices.
3. Complete final consumer/privacy/tax review, then implement and test the affirmative digital-content consent and durable purchase confirmation before opening sales.
4. Connect to Resend's provider activity/status view to reconcile the pending receipt before any resend.


## Follow-up: pending membership Checkout event — 14 November 2026

- Fresh Test Mode Stripe API retrieval confirms `evt_1Ub6xTKS41qhUQTKCAsjwHU2` remains `pending_webhooks=1`. Its embedded Checkout Session is complete and paid (£1.99 GBP), has `mode=subscription`, and metadata `membership=monthly-learning`, `mode=test`; it is not a course purchase.
- Stripe API operation discovery returned no event-redelivery/write operation for this endpoint. Stripe's Workbench documentation says sandbox events can be manually retried from the event destination's **Event deliveries** page after automatic retries; the available integration here does not expose that UI action.
- No retry, payment, checkout, live change, email, or database mutation was performed. The next step requires the Dashboard: Test Mode → Workbench → Webhooks → `stripe-test-webhook` → Event deliveries → find this event → resend to this destination only; then verify HTTP 200 and confirm no course access was granted for this subscription event.
- Source and prior routing review still show the event belongs on the subscription-ignoring course endpoint only for acknowledgement in this test; do not resend it to the membership endpoint.


## Supabase entitlement check for pending membership event — 14 November 2026

- Read-only lookup of the exact Stripe Checkout Session `cs_test_a04ZHXq0Z9NAXC09vZaAkXHgZcpxLDfy56fZLBqYbISkbnyNoAVGnvlhpu` found zero matching rows in `course_access`, `lesson_access`, and `purchase_confirmations`.
- Its linked sandbox membership row remains active, `livemode=false`, and `cancel_at_period_end=true`, with period end 12 December 2026 22:59 UTC. This is consistent with a paid test subscription and confirms this Checkout Session did not grant a course or create a course purchase confirmation.
- No database rows were changed. The Stripe delivery itself is still pending; this check does not replace the required Workbench retry/HTTP 200 verification.


## Successful manual retry of pending sandbox subscription event — 14 November 2026

- Stripe Workbench shows the manual resend of `evt_1Ub6xTKS41qhUQTKCAsjwHU2` to the Test Mode `stripe-test-webhook` destination as **Delivered**, attempt time 14 November 2026 20:57:11 GMT.
- Fresh Stripe API read now reports `pending_webhooks=0`. The event is still the paid GBP 1.99 `checkout.session.completed` subscription-mode session; it was not a course purchase.
- Supabase function-edge logs independently confirm a Stripe POST to `/functions/v1/stripe-test-webhook` returned **HTTP 200** at 20:57:11 GMT, handled by deployed function version **29**.
- Read-only Supabase checks after delivery found zero matching `course_access`, `lesson_access`, and `purchase_confirmations` rows for this Checkout Session. The subscription event was acknowledged without granting course access.
- No payment was created and no database rows, live settings, or subscription settings were changed. The failed 422 was the earlier historical attempt; the manual retry after v29 deployment succeeded.

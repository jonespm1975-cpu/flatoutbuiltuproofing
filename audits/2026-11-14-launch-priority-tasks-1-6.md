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


## Next pending Test Mode course Checkout event — 14 November 2026

- Stripe API readback confirms `evt_1UaR5FKS41qhUQTK9ekgoE4b` remains pending (`pending_webhooks=1`). It is a paid Test Mode one-time course Checkout Session: £9.99 subtotal, £11.99 total (including test tax), for `beginner-training-course`.
- Supabase currently has one matching course-access row and one purchase receipt for the exact session. Its sandbox email queue row remains pending, attempts 0, with no provider message ID or stored error. No email has been sent.
- Read deployed `stripe-test-webhook` v29: course access, receipt persistence, and queue creation use conflict-safe idempotent upserts; the handler does not send email. Re-delivery to the subscribed Test Mode `stripe-test-webhook` destination should not duplicate the existing access/receipt, and would only ensure the pending confirmation is queued.
- The owner previously authorized retrying the existing 11 November course event to `stripe-test-webhook` only. Do not send it to the membership or live endpoint. No retry was made in this step; Dashboard resend is still required.


## Successful manual retry of Test Mode course Checkout event — 14 November 2026

- Stripe Workbench shows `evt_1UaR5FKS41qhUQTK9ekgoE4b` was manually resent to `stripe-test-webhook` and marked **Delivered** at 21:04:55 GMT.
- Stripe API now reports `pending_webhooks=0`. The event is the existing paid GBP 11.99 Test Mode one-time course session (GBP 9.99 subtotal plus GBP 2.00 test tax).
- Supabase function-edge logs independently confirm HTTP **200** from deployed `stripe-test-webhook` version **29** at 21:04:55 GMT.
- Post-retry database read confirms exactly one matching course-access row and one receipt. The sandbox email queue remains `pending`, attempts 0, with no provider message ID and no stored error. The webhook did not send email; provider delivery remains unverified.
- No payment was created and no live settings or subscription state was changed.


## Email reconciliation after successful course webhook retry — 14 November 2026

- After Stripe confirmed the existing course event was delivered and Supabase confirmed the single course-access grant and receipt, a read-only check found the receipt's email queue still pending: 0 attempts, no lease, no provider message ID, and no recorded error. The next-attempt time is past.
- Gmail search found no matching purchase-confirmation message. This does not distinguish a message never submitted from provider acceptance without delivery.
- Resend provider activity cannot be checked from this session: plugin discovery returned no Resend connector, and no Resend tool is exposed. No substitute mail provider was used.
- No email was sent or resent, and no queue/database state was changed. Reconcile the existing message in Resend's activity view once that provider connection is available; decide on a retry only after checking for an existing provider message.


## Sandbox email worker safety and queue reconciliation — 14 November 2026

- Re-read deployed purchase-email-retry-worker version 10. It explicitly reports mode=sandbox-dry-run, sending_enabled=false, claiming_enabled=false, scheduler_enabled=false, and action=none; it only inspects queue/receipt eligibility. No request was sent to the worker.
- Read-only queue/receipt join returned two sandbox rows: one pending receipt/queue eligible by sandbox-test terms and cs_test_ prefix, with 0 attempts, no lease, provider ID or error; and one older receipt marked sent with queue status accepted but no provider message ID. The pending row's scheduled attempt time is in the past.
- The current database state is consistent with no automatic email processing path being active; it does not establish whether Resend accepted either message. The worker's dry-run code cannot deliver or claim queued work, and no scheduler is enabled.
- No email, queue mutation, live configuration change, or payment was made. To progress safely, first inspect the existing pending item in Resend provider activity; do not enable the sender or retry until the provider connection is available and its message history has been checked.


## Read-only sandbox email concurrency source and privilege check — 14 November 2026

- Read the installed definitions of internal.claim_sandbox_email_retry_v2 and internal.finish_sandbox_email_retry_v3. The claim function selects due eligible rows with FOR UPDATE SKIP LOCKED, increments attempts, and applies a five-minute lease. The finish function validates the cs_test_ prefix, matching live lease token, pending sandbox receipt, and requires a provider ID before recording acceptance.
- Privilege readback shows anon and authenticated cannot execute either function; service_role can. No privilege was changed.
- Supabase lists no development branches for this project. The connected SQL interface cannot establish that concurrent calls used two independent simultaneous database connections, and no real claim/finish calls were made against production queue rows. Therefore genuine concurrency remains unverified despite the source-level locking and privilege checks.
- No email, payment, queue mutation, function deployment, or database setting change was performed. A genuinely isolated two-connection harness is still required to close this test.


## Isolated concurrency test environment check — 14 November 2026

- Read the saved task_176_test_plan.sql. It explicitly requires a disposable Supabase-compatible clone, synthetic auth user, rollback-only fixtures, and two independent terminal sessions; it forbids execution against live Supabase.
- Supabase currently has no development branches. The available local runtime has no Docker/Podman or PostgreSQL client/server binaries, so this workspace cannot provide the required isolated database or two-session harness.
- The test plan concerns live purchase-fulfilment RPC behavior; no such SQL was executed against production. No database, queue, payment, email, deployment, or plan setting was changed.
- The concurrency test remains blocked until an isolated PostgreSQL/Supabase-compatible environment is available. Preserve the Free plan and do not create a billable branch without explicit approval.


## Ten-priority parallel verification batch — 14 November 2026, 21:xx UTC

Scope: independent read-only checks of the existing launch blockers. No checkout or payment created, no event resent, no email sent, no production setting or subscription changed, and no database writes performed.

1. Stripe Test Mode membership event `evt_1Ub6xTKS41qhUQTKCAsjwHU2`: current API readback now reports `pending_webhooks=0`; existing £1.99 subscription Checkout Session is paid and complete.
2. Stripe Test Mode course event `evt_1UaR5FKS41qhUQTK9ekgoE4b`: current API readback now reports `pending_webhooks=0`; existing one-time Checkout Session is paid and complete (£9.99 subtotal, £11.99 total including sandbox tax).
3. Destination routing: enabled `stripe-test-webhook` is subscribed to Checkout completion/async success; `membership-test-webhook` is subscribed to subscription and invoice lifecycle events. No endpoint configuration was changed.
4. Course fulfilment reconciliation: a read-only exact-session query found one `course_access` row and one `purchase_confirmations` row for the paid course session. No `lesson_access` row is expected from this checkout flow.
5. Membership isolation: earlier exact-session read found no course/access receipt rows for the subscription-mode session; it is handled by the acknowledged subscription-ignore branch and does not create course access.
6. Function delivery log: the existing course-event delivery has a matching HTTP 200 at 21:04:55 UTC from deployed `stripe-test-webhook` v29. The membership event’s HTTP 200 at 20:57:11 UTC was already independently recorded above.
7. Email queue/provider: existing course confirmation remains pending with no provider message ID; Gmail has no matching receipt, and Resend status cannot be queried with the currently connected tools. No send or resend was attempted.
8. Retry worker and concurrency: sandbox email worker v10 is dry-run only with sending, claiming, and scheduling disabled. Source-level claim uses `FOR UPDATE SKIP LOCKED` with service-role-only execution, but a real isolated two-connection concurrency test remains blocked (no Supabase branch or local Postgres/Docker runtime).
9. Live/tax safety: Stripe Live tax settings were read only; status is active, default behavior exclusive, and account tax/address information is incomplete in the returned configuration. No live setting or payment was changed; owner/qualified tax review remains required.
10. Launch/legal/provider readiness: repository legal and purchase pages remain drafts with owner-confirmation/review items. Google Drive had no project legal files; Resend provider status is unavailable. No legal publication or email-provider substitution was made.

### Next blockers

- Reconcile the pending sandbox confirmation in Resend activity before considering any email retry.
- Run the concurrency plan only in a disposable Supabase-compatible environment with two independent sessions; keep the current Supabase Free plan.
- Complete owner-confirmed privacy/cookie/consumer terms and qualified tax review before commercial launch.
- Verify the effective live checkout flag and complete a final consent-to-access journey only after the above launch gates are satisfied; do not enable live billing as part of this audit.


## Five next launch-priority blockers rechecked — 14 November 2026

Read-only follow-up. No payment, Checkout Session, email, database write, live setting change, or deployment was performed.

1. **Sandbox email provider reconciliation — still blocked.** Searched plugin availability for Resend provider activity/status; the results did not expose a Resend connector. The sandbox confirmation remains pending in the prior queue read, so no retry was attempted.
2. **Isolated concurrency proof — still blocked.** Supabase branch list is empty. No local PostgreSQL/Docker/Podman runtime was available in the earlier environment check. The source-level SKIP LOCKED/privilege review remains evidence of implementation only, not a real two-connection test. No production queue operation was used as a test.
3. **Legal/customer terms — still draft.** Re-read privacy, terms, and refunds pages. They retain draft/owner-review notices. The privacy notice has remaining operational data-practice details to confirm; checkout/digital-delivery and consumer wording still needs final owner/legal review. No legal wording was invented or published.
4. **Tax readiness — no safe change available.** The latest verified Stripe Live tax readback remains active with incomplete account tax/address information and no registrations. Qualified review is still required; no tax behavior, registration, or billing setting was changed.
5. **Live checkout readiness — configuration cannot be proven active.** Re-read deployed `stripe-live-checkout` v12: it denies requests unless `STRIPE_LIVE_CHECKOUT_ENABLED=true`, a live Stripe key and Supabase configuration exist, the user is authenticated, and terms/immediate-access/cancellation consents are affirmative. The connected tools do not expose the effective secret values or provide a safe authenticated end-to-end run here. No Checkout Session was created and no live setting was enabled.

### Disposition

These five gates have been rechecked, but remain open where external provider access, isolated test infrastructure, owner-confirmed facts, or qualified review is required. Keep live launch on hold until they are cleared. Existing sandbox Stripe event deliveries remain resolved as recorded in the prior section.


## Follow-up on next five priorities — 14 November 2026

- Exact plugin-directory search for **Resend** returned no matching plugin. The pending sandbox email therefore remains unreconciled; no message was sent or retried.
- Fresh Supabase branch listing remains empty. A disposable branch/concurrency environment is not available; no production SQL was used as a substitute.
- Re-read the active `stripe-live-checkout` function v12. It requires the explicit live-enable secret, live Stripe key and Supabase config, authenticated non-anonymous user, and affirmative terms/immediate-delivery/cancellation acknowledgements. Secret values are not exposed by the available Supabase tools; no checkout was created.
- The current privacy, terms, and refunds repository pages still carry DRAFT/owner-review notices. The privacy and consumer checkout terms still need operational facts/final review; no legal pages were altered or published.
- Attempted to refresh the Live Stripe account/tax readback; the Stripe account-list tool returned an unknown-tool error in this session. The last successful tax configuration read remains the prior audit entry; it was not treated as a fresh check and nothing was changed.

No payment, email, retry, database write, live setting change, legal publication, or deployment was performed. The five priorities remain open pending provider access, isolated test infrastructure, final owner/legal input, qualified tax review, and an authorized way to inspect effective live configuration.


## Official UK tax and consumer/privacy guidance review — 14 November 2026

Read-only research to progress the tax and legal gates; no website or payment settings were changed.

- HMRC currently states the VAT registration threshold is £90,000 of taxable turnover over the previous 12 months, or expected to exceed £90,000 in the next 30 days. This is the sole trader's taxable-turnover test; the owner should account for all relevant business taxable supplies, not just website course sales. The owner has previously stated they are not VAT registered. [HMRC registration guidance](https://www.gov.uk/register-for-vat).
- HMRC classifies automatically supplied pre-recorded video/download courses as electronic services in its examples. For UK consumers, digital-service supplies are liable to UK VAT; supplies to consumers abroad may be subject to tax in their country. HMRC says a qualifying digital platform/marketplace may account for VAT, but the current Stripe setup has only been established as payment processing; do not assume it is merchant of record. Tax treatment and any overseas sales need an accountant/HMRC determination. [HMRC digital-services guidance](https://www.gov.uk/guidance/the-vat-rules-if-you-supply-digital-services-to-private-consumers).
- Regulation 37 of the Consumer Contracts Regulations says digital content supply during the cancellation period requires the consumer's express consent to start and acknowledgement that the cancellation right is lost; it also requires the trader's confirmation specified by the regulations. The deployed live Checkout source has explicit immediate-access and cancellation-acknowledgement fields, but this source review does not verify the website UI, recorded evidence, or durable confirmation in an end-to-end customer flow. [Legislation.gov.uk, regulation 37](https://www.legislation.gov.uk/uksi/2013/3134/regulation/37/2026-01-01).
- ICO small-organisation guidance says a privacy notice should identify collected data, purposes, lawful bases, recipients, retention, rights, and contact details. ICO cookie guidance requires clear information and active consent for non-essential storage/access technologies before they are used. The actual data-retention and cookie/vendor inventory still require confirmation from the owner. [ICO privacy notice guidance](https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/how-to-write-a-privacy-notice-and-what-goes-in-it); [ICO cookie guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/).

These references clarify the review criteria but do not replace individualized legal/tax advice or the missing operational facts. No legal pages were published, no VAT registration or tax configuration was changed, and no Checkout Session was created.


## Resend dashboard evidence matched to sandbox receipt — 14 November 2026

- Read-only inspection of the user's Resend Emails dashboard found a **Delivered** message with subject `[TEST ONLY] Flat Out Built-Up Roofing sandbox course confirmation`. Its message body identifies Checkout Session `cs_test_a0caswbXc3HIkD4VZJRQ7ZZ3W6dT5TICnhxcb0PZ0v1gYUOhHT5v00Ssye` and explicitly labels it a TEST MODE purchase.
- Read-only Supabase lookup for that exact session confirms one receipt marked `sent` at 2026-11-12 22:28:36 UTC and its queue row `accepted`. This reconciles the older session's provider-delivery discrepancy. The queue row does not store a Resend provider message ID.
- The separate, newer session `cs_test_a0TY2kMZoZpfg5ceI4lrSvnknG6ihGgkVhrpseYkvr6eHAyOWtnL5PHt5u` remains receipt `pending` / queue `pending`, attempts 0, no provider ID, created 2026-11-14 18:56 UTC. It does not match the Resend message opened above; the screenshot's delivered message is not evidence for this newer receipt.
- No email was sent or resent; no queue/database row changed. Reconcile the newer session only after its exact message is found in Resend (or establish that no provider submission exists, then follow the already-approved safe process).


## Follow-up verification of the next five launch items — 14 November 2026

1. **Resend status and newer pending receipt:** The owner confirmed the delivered message to his wife's email address was her website test, not a customer purchase. The older sandbox session matched in Resend remains a delivered test. The separate newer session `cs_test_a0TY2kMZoZpfg5ceI4lrSvnknG6ihGgkVhrpseYkvr6eHAyOWtnL5PHt5u` still has a pending receipt and queue row, 0 attempts, no provider ID, and no error. Read-only source inspection of deployed `purchase-email-retry-worker` v10 shows `mode=sandbox-dry-run`, with sending, claiming and scheduling all hard-disabled. The searched Supabase log window contains no worker attempt for this session. The blocker is an intentionally inactive delivery worker, not a recorded provider rejection. No email was sent or resent and no queue row was changed.

2. **Concurrency proof:** The project has no development branches. Two parallel read-only SQL calls returned different PostgreSQL backend PIDs, but their recorded start times were about 3.8 seconds apart and the combined call took about 7.9 seconds for two 3-second sleeps. This connector serialized the calls; they do not demonstrate simultaneous lock contention. No claim function was invoked and no database state changed. A genuine isolated contention test remains unproven; branch creation was not attempted because it may incur charges and requires prior cost/approval handling.

3. **Legal documents:** The current `terms.html`, `privacy.html`, and `refunds.html` remain marked DRAFT and require owner review. Privacy still contains unresolved retention-period, processor/transfer, age-policy, marketing and actual-service inventory details. Device compatibility and accessibility statements still require verification. The tax/merchant-of-record wording also must not imply that Stripe is the merchant of record without confirmation. No legal page was published or edited.

4. **Tax configuration:** Read-only Stripe live-account checks on 14 November returned Tax Settings status `active`, defaults `provider=stripe`, `tax_behavior=exclusive`, and tax code `txcd_20060258`; the GB head-office address fields other than country were empty. The live tax-registration list is empty. Stripe threshold monitoring returned empty location arrays and `computed_at=null`, so it provides no current threshold result or freshness timestamp. The owner has previously stated the business is not VAT registered. No registration or tax settings were added or changed.

5. **Live checkout state:** Deployed `stripe-live-checkout` v12 requires `STRIPE_LIVE_CHECKOUT_ENABLED=true`, a live Stripe key, an authenticated customer, and affirmative terms/immediate-access/cancellation consent before creating a Checkout Session. The Supabase connector does not provide effective secret values, so the flag's current value remains unverified. No Checkout Session was created and no live setting was changed.

No customer payments, sandbox payments, email sends, webhook replays, subscription changes, or production database writes occurred during these checks.


## Latest launch-gate verification — 14 November 2026

Read-only follow-up for the six launch items. No payments or Checkout Sessions were created, no emails sent, no database rows or provider settings changed, and no legal pages published.

1. **Resend / owner email:** the sending domain is Verified/Ready. Resend's owner-recipient search showed only a delivered account welcome message, not a course-purchase confirmation. The delivered sandbox confirmation to the user's wife's test address is her website test and is not evidence of an owner or customer receipt. The separate sandbox receipt `cs_test_a0TY2kMZoZpfg5ceI4lrSvnknG6ihGgkVhrpseYkvr6eHAyOWtnL5PHt5u` remains pending in Supabase at GBP 11.99 / `sandbox-test` terms version, with no sent timestamp. Worker v10 is dry-run: no claiming, sending or scheduling. No email was sent.

2. **Live checkout / webhook / price / tax:** Stripe Live readback confirms referenced Price `price_1UaRJvKeIprRDTKxKDawW6ZG` is active, one-time, GBP 9.99 and tax-inclusive. Checkout source v12 uses that exact Price and requires authenticated user plus affirmative terms, immediate-supply and cancellation acknowledgements, recording a consent timestamp in Session metadata. The actual live flag and secret values are not exposed by the connected Supabase tools. The webhook source v31 verifies the Stripe signature, checks live mode, paid status, exact 999-pence amount, expected Price, user/course mapping and consent metadata before idempotent access/receipt writes. It sends the email inline; provider failure can still leave access granted while returning 503. The Checkout source does not set Stripe automatic tax. Stripe Tax status reads active, with exclusive default behavior and an unpopulated GB head-office address; no tax configuration changed. The owner's stated non-VAT-registered status does not settle cross-border digital-service obligations.

3. **Legal:** terms, privacy and refunds remain marked DRAFT. Privacy still has unconfirmed retention, processor/transfer, lawful-basis, marketing/cookie, age-policy and security details. Refund and terms wording still needs final consumer-law and operational review; the site must not claim Stripe is merchant of record without confirmation. Regulation 37 requires valid prior express consent and acknowledgement to begin digital supply within the cancellation period. No pages were edited or published. Official review references: [Regulation 37](https://www.legislation.gov.uk/uksi/2013/3134/regulation/37), [HMRC digital services guidance](https://www.gov.uk/guidance/the-vat-rules-if-you-supply-digital-services-to-private-consumers), and [ICO cookie guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/).

4. **Course readiness:** `paid-lesson-content` v16 requires a verified signed-in user and an existing `cs_live_` course-access grant; function JWT verification is enabled. The current served paid lesson is “Lesson 1: Roof Inspection and Planning” with six concise sections and a short knowledge check. This source read confirms the access gate, but not a complete paid curriculum, runtime denial/access, or device accessibility. Course catalogue says new paid sales are closed; the available content is not sufficient evidence that a paid course is complete.

5. **Concurrency:** no new production call was used as a test. Prior read-only attempts were serialized by the connector; they do not prove simultaneous contention. No isolated two-connection database environment is available in this session, so the test remains open.

6. **Controlled live checkout:** not run. Effective enablement cannot be read, no authenticated live session was created, and a completed test requires a user-authorized real payment. Do not treat source review or a test-mode receipt as proof of a live purchase journey.

**Disposition:** keep live sales closed, leave legal pages as drafts, and do not enable the email worker until its protected invocation, secrets and owner-recipient test are verified. Remaining gates require owner-confirmed privacy/tax facts, a complete course/accessibility review, genuine isolated concurrency infrastructure, verified live secrets/flags, and the user's own controlled live payment followed by readback.

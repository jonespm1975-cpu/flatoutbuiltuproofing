# Flat Out Built-Up Roofing — £1.99 membership controlled sandbox test plan

## 21 November 2026 — verification and remaining launch work

- Stripe sandbox has one active £1.99 monthly subscription with a paid 199p invoice. The paid period ends at 22:59 GMT on 12 December 2026 with cancellation scheduled. Supabase shows the same state and exact Stripe event timestamp for the cancellation update. Stripe also records subscription creation and invoice payment, with no pending webhook deliveries on those event records. Per-destination Workbench HTTP history was not verified.
- A rollback-only database test exercised the installed membership sync function for initial sync, duplicate and older events, failed renewal, return to active, cancellation and sandbox isolation. The temporary row was rolled back. The sync function is executable by the service role; anonymous and authenticated clients cannot call it.
- Eight local tests ran the deployed sandbox webhook source with mocked Stripe and database calls. Paid invoice, failed invoice, cancellation scheduling, effective cancellation, off-Stripe payment, rejected signature, wrong price and live-mode rejection passed. This run did not generate signed Stripe events, test true concurrent requests or exercise a fresh hosted Customer Portal session.
- Stripe live already has an active GBP 199p monthly price with inclusive tax behavior. The connected live account returned zero subscriptions and zero active Payment Links. The public course catalogue still says subscription checkout is unavailable, and the deployed Edge Function inventory exposes sandbox membership checkout, webhook and portal only. The live one-off £9.99 checkout is separate.
- Owner decision, 21 November 2026: Roof Inspection and Planning stays a separate £9.99 purchase. An active or cancelled Learning Pass does not grant or revoke that purchased entitlement. The catalogue now states this explicitly. The rest of the membership scope still needs a specific list of included resources.
- Tested both deployed access handlers locally with mocked Supabase responses. Membership alone opened the separate mobile guide and was denied the protected £9.99 lesson. Purchase alone opened both. An account with both entitlements opened both, and an account with neither was denied both. This test did not use live customer accounts. Free learning continues to be publicly available, and the existing site terms say recurring billing is unavailable.
- Before public checkout, implement the dedicated live membership checkout, signed lifecycle event handler and customer portal; confirm the included resources and gate them server-side; publish the recurring terms and confirmation; verify genuine sandbox renewal, failure, cancellation and expiration, plus refund and dispute handling. Show the full £1.99 monthly charge and cancellation route before purchase. Verify Stripe Tax settings at launch against the current UK-only, non-VAT-registered business setup.
- No subscription, payment, portal session, customer email, or production setting was created or changed in this verification.

### Live cancellation portal prepared for review

- The review branch adds a dedicated endpoint for an authenticated membership customer to open a Stripe-hosted cancellation screen. The endpoint uses the signed-in user's live subscription record, independently verifies its Stripe customer, owner and £1.99 monthly price, and targets that exact subscription. The Stripe portal configuration must support cancellation at the end of the billing period. A cancellation redirect returns to My Learning, where status must come from the signed subscription webhook.
- Configure `MEMBERSHIP_LIVE_PRICE_ID`, `MEMBERSHIP_LIVE_PORTAL_STRIPE_KEY` (live Stripe key with subscription and portal configuration reads and portal session writes), and `MEMBERSHIP_LIVE_PORTAL_CONFIGURATION_ID` (a dedicated live Stripe configuration). The endpoint is disabled unless `MEMBERSHIP_LIVE_PORTAL_ENABLED` is explicitly set to `true`.
- Fourteen local scenarios passed using mocked Supabase and Stripe services. They covered account ownership, test/live isolation, an already scheduled cancellation, refusal of immediate-cancellation settings, and the redirect to the approved Stripe host. No actual Stripe portal session was opened. Deployment and a hosted end-to-end test are pending.

- My Learning now shows live membership status and a cancellation button for the customer with a cancellable subscription. A scheduled cancellation is shown with the paid-period end date when available. The return from Stripe does not grant or revoke anything. One-off course access continues to use the separate purchase entitlement. Eleven local scenarios passed with mocked services, including status lookup failure, already scheduled cancellation and invalid redirect handling. The review branch has not been deployed or exercised with hosted Stripe.

### Live membership lifecycle prepared for review

- The dedicated membership webhook validates Stripe's signature and live mode. It reconciles the canonical subscription, its original UK Checkout session and its current £1.99 invoice before writing the entitlement. It requires provider payment for the current billing period to write active status. Unpaid, paused and canceled periods do not grant access. The existing one-off course webhook is separate.
- The database change adds a service-role-only upsert. It uses an observation sequence to stop an earlier reconciliation from overwriting a later one, and rejects changes to the owner, Stripe customer, price or mode of an existing subscription.
- Seventeen local lifecycle cases passed with real Stripe SDK verification of locally signed fixtures and mocked provider lookups. Strict TypeScript checking passed with the pinned SDK packages. Local PostgreSQL checks passed for repeated and stale sync writes, mismatched ownership, test/live isolation and role restrictions. Genuine Stripe deliveries and two-connection contention were not exercised.
- At deployment, apply the reviewed SQL and use a dedicated Stripe destination for this function, with JWT verification disabled for the Stripe callback and signature checks enabled in the handler. Configure `MEMBERSHIP_LIVE_PRICE_ID`, `MEMBERSHIP_LIVE_WEBHOOK_STRIPE_KEY` and `MEMBERSHIP_LIVE_WEBHOOK_SECRET`. Keep `MEMBERSHIP_LIVE_FULFILMENT_ENABLED` false until the staged integration is ready for the controlled go-live sequence.
- The checkout implementation must set `client_reference_id` to the authenticated account ID, copy the immutable `membership_terms_version` to session and subscription metadata, set the subscription metadata keys `supabase_user_id`, `membership=monthly-learning` and `mode=live`, and record `eligibility_policy=uk-address-v1` with Stripe's GB-only collected address. Use signed lifecycle events and durable confirmation records for final acceptance.
- Refund and dispute handling, the customer-facing order page, the membership contract confirmation, hosting and full signed Stripe lifecycle tests remain open. No migration, Edge Function, Stripe destination or recurring billing settings were changed by this review work.

### Live membership checkout backend prepared for review

- A separate, sign-in-required checkout endpoint validates the current terms version and affirmative consent to the agreement, recurring billing, immediate supply and cancellation acknowledgement. It saves the approved terms version and consent timestamp to a service-only reservation before asking Stripe to open Checkout. It checks Stripe's active £1.99 GBP monthly price and restricts the collected address to GB. Stripe Tax is disabled for this checkout under the current UK-only, non-VAT-registered setup.
- There is one current reservation per user. Retries reuse the recorded Stripe session or the same Stripe idempotency key. A completed session can only be replaced after Stripe verifies the associated subscription reached a terminal state. When an unrecorded request is older than the retry window, the endpoint requires reconciliation rather than creating a new session. Superseded records are retained for consent verification.
- The membership lifecycle webhook now matches each paid signup to its database reservation and checks the Checkout consent flags. The one-off £9.99 purchase is separate.
- Strict TypeScript checks passed for the checkout and updated webhook. Sixteen mocked checkout cases, four locally signed webhook linkage cases and local PostgreSQL reservation checks passed. Two-connection contention, hosted Stripe checkout and provider idempotency behavior were not exercised.
- The review SQL and functions were not deployed. Set `MEMBERSHIP_LIVE_CHECKOUT_STRIPE_KEY`, `MEMBERSHIP_LIVE_PRICE_ID` and `MEMBERSHIP_LIVE_TERMS_VERSION` after preparing the final contract, and leave `MEMBERSHIP_LIVE_CHECKOUT_ENABLED` false until the customer order page, contract confirmation and controlled sandbox tests are complete. The order page will use `membership-order.html`, and My Learning will receive `membership=checkout-return`.

### Customer order page and membership terms prepared for review

- The preview catalogue links to `membership-order.html`. The page shows £1.99 today and each month until canceled, the UK address check, the cancellation route and the four separate, initially unticked consent statements. Its login return is allowlisted and it sends only the selected statements and terms version to the membership checkout endpoint. My Learning explains that a return from Stripe can precede payment and confirmation processing.
- Draft terms version `2026-11-21-learning-pass-v1` is at `membership-terms-2026-11-21-learning-pass-v1.html`. The draft describes the Voice Learning App guide as the included benefit because it is the protected membership content already verified. The broader membership catalogue remains to be confirmed before launch. Roof Inspection and Planning remains a separate £9.99 purchase.
- Ten local browser DOM scenarios passed with mocked services, covering login, incomplete consent, successful redirects, unavailable checkout and unsafe redirect rejection. No hosted checkout was opened.
- Before launch, confirm the included resources, review the membership contract text, send the versioned agreement and recorded consent on a durable medium and gate access until confirmation has been sent. Reconcile public policy references to subscription availability when switching the product on. None of these review changes were published to the live website.

### Membership confirmation and first-access gate prepared for review

- The webhook now records the verified membership state and queues one confirmation in the same database transaction. Its paid Stripe session must match the original checkout reservation. The confirmation goes to the verified account email recorded when the job is queued. Repeat deliveries cannot create a second confirmation for the same signup.
- The membership entitlement function checks for an active, unexpired paid period and a recorded confirmation send. One-off purchase access continues through its separate database records. Renewal under the same subscription uses the initial confirmation. A new subscription needs its own confirmation.
- The dedicated worker attaches the fixed membership terms and includes the £1.99 monthly charge, consent timestamp, cancellation instructions and statutory-rights wording. It uses a durable idempotency key, atomic leases, bounded retry and a manual-reconciliation state after exhausted or uncertain delivery. Provider acceptance is recorded as a send and does not establish inbox delivery.
- Local PostgreSQL verified one queued confirmation, the access gate, retry backoff, stale lease rejection, successful completion, cancellation and role restrictions. Eleven worker cases passed with mocked Resend and database services. Strict TypeScript checking passed. No real email was sent.
- Apply the reviewed launch SQL in the order `membership-lifecycle.sql`, `membership-checkout.sql`, then `membership-confirmations.sql`. The worker needs its scheduled caller deployed and a shared token in Supabase Vault and function secrets (`MEMBERSHIP_LIVE_CONFIRMATION_WORKER_TOKEN`). Keep `MEMBERSHIP_LIVE_CONFIRMATION_ENABLED` false until a controlled integration test is approved. Use the existing sender identity (`PURCHASE_CONFIRMATION_FROM`) and Resend credential. Verify one buyer confirmation reaches the intended test inbox before opening checkout.
- The review branch has not been deployed. No live scheduling, email settings or payment settings changed. Refunds, disputes, a complete membership content list and paid Stripe sandbox tests remain open.

### Membership email schedule prepared for review

- `supabase/launch/membership-confirmation-schedule.sql` installs a separate, initially disabled job named `fobur-live-membership-confirmation-worker`. It checks once per minute for due confirmations and expired retry windows. An empty queue makes no HTTP call. Reapplying the SQL leaves the job's activation state alone. The existing £9.99 receipt schedule did not change.
- Before turning the job on, deploy the worker with gateway JWT validation disabled for this endpoint so its dedicated bearer-token check handles authorisation. Store the same generated, URL-safe token (32–128 characters) in Supabase Vault as `membership_live_confirmation_worker_token` and in the worker environment as `MEMBERSHIP_LIVE_CONFIRMATION_WORKER_TOKEN`. Put that environment's exact `https://<project-ref>.supabase.co` in Vault as `membership_live_confirmation_project_url`. Review both configurations together and keep credentials out of SQL and GitHub.
- In a controlled test, enable the reviewed worker and job, queue one test confirmation and verify a worker response and Resend delivery. Cron success alone means the HTTP request was queued. It does not establish a successful HTTP response or an email delivered to the buyer. A privileged operator can run the dispatcher once and correlate the returned request ID with `net._http_response` when troubleshooting.
- Confirmed that this Supabase project has pg_cron, pg_net and Vault installed, including the scheduling and HTTP signatures used by the draft. Local PostgreSQL checks used stand-ins for Cron, Vault and HTTP. They verified disabled-on-install, an unchanged £9.99 job, no idle HTTP calls, due work, retry cleanup, invalid settings and role restrictions. No schedule or email was activated or sent.

### Integrated scheduled confirmation test

- Running the staged webhook and worker against the staged SQL exposed a named-parameter mismatch. The webhook sent `payload` but the Supabase RPC accepts `p_payload`. Corrected the webhook and added a regression check that matches each RPC request to its declared parameters.
- The test uses real Stripe SDK verification of locally signed events, an isolated PostgreSQL database, and simulated Stripe lookups, the scheduler HTTP request and Resend responses. It verified one confirmation for repeated paid events, no access before sending, a failed first send with a scheduled retry, the same message and idempotency key on retry, access after provider acceptance, and access removal on cancellation. The separate course receipt schedule remained active in the fixture.
- Run `supabase/tests/membership-confirmation-integration.mjs` on Node 24 with `stripe@23.2.0` and `@electric-sql/pglite@0.5.17` installed locally. The test reads the branch's current functions and SQL and makes no external network requests.
- No hosted email delivery was exercised. The connected Supabase account exposed the production project and no separate environment for a controlled hosted membership order. No production job, payment setting or email route changed.

### Membership refund and dispute handling prepared for review

- The signed webhook links refund and dispute events by Stripe PaymentIntent and Invoice Payment to the affected subscription. It checks the current paid period against the latest Stripe invoice and collected payment. An event for the separate one-off course does not update membership.
- The review implementation treats the current membership period as unpaid when the collectible amount is below £1.99, including after a partial refund that puts the balance below that amount, or when the current charge has an unresolved or lost dispute. A resolved dispute in the merchant's favour can restore access when the current period is still fully funded and otherwise eligible. A refund for an older period does not remove a later fully paid period. The webhook sends no refund, changes no Stripe subscription and creates no extra confirmation emails.
- The integrated test used locally signed fixtures and simulated Stripe reads. It verified old-period and separate-course refund isolation, an open dispute, a win and a loss, partial and full refunds, and recovery after a failed refund. The checkout, confirmation, retry and cancellation checks still pass. Strict TypeScript checking passed.
- At deployment, add the refund and dispute events listed in the review webhook only to the dedicated membership destination. Its Stripe credential needs read access for Invoice Payments, PaymentIntents, Charges and Disputes in addition to existing readers. Hosted Stripe verification, inbox delivery and launch approval remain pending.

### Hosted Stripe sandbox billing evidence

- Created a new payment test customer with no email address using Stripe's Visa test fixture. Its separate £1.99 monthly sandbox subscription `sub_1UeHtLKS41qhUQTKnvig6U3S` became active and Stripe recorded a paid 199p GBP first invoice. Canonical Invoice Payment data linked that invoice to a succeeded PaymentIntent and the matching Stripe charge showed 199p captured. Automatic tax was disabled for the test subscription.
- The fixture subscription had a flexible billing mode. Resetting its billing-cycle anchor moved the billing date. A forced invoice was a zero-value subscription-update adjustment. This did not verify a paid automatic renewal.
- Scheduled cancellation at the end of this fixture's period and refreshed it from Stripe. Verified `cancel_at_period_end=true` and `cancel_at` equal to the paid period end, 2026-12-21T17:16:59.000Z. The existing sandbox reference subscription and production billing were unaffected.
- This used Stripe's sandbox Billing API with a separate fixture. It did not complete hosted website Checkout, invoke the review membership webhook as a hosted service, simulate a natural clock-driven renewal or deliver any email. The connected Stripe interface supported creating a test clock; advancing it was unavailable. The fresh fixture was left scheduled to stop renewing.

The preparation checklist below records the earlier sandbox setup.

**Prepared:** 2026-11-12 GMT
**Scope:** Stripe TEST account `acct_1UaPRuKS41qhUQTK`, Supabase project `fhyhshakmvqwzdyannec`.
**Safety:** Do not use real card details or enable live billing. Maintain separation from the £9.99 one-off course.

## Available test entry
Unlinked test page: `https://flatoutbuiltuproofing.co.uk/membership-sandbox-test.html`.
GitHub source: `membership-sandbox-test.html`.
This is an unlisted public static page, NOT owner-authenticated merely by its URL. Its checkout request must be authenticated by the existing Supabase Edge Function.

## Preconditions — must be confirmed before initiating a test checkout
- [ ] Confirm `MEMBERSHIP_TEST_CHECKOUT_ENABLED` is exactly `true` inside the runtime (a masked digest alone proves only existence).
- [ ] Confirm `MEMBERSHIP_TEST_FULFILMENT_ENABLED` is exactly `true`.
- [ ] Confirm `MEMBERSHIP_TEST_WEBHOOK_SECRET` matches the signing secret on Stripe's dedicated TEST membership webhook endpoint. Never paste its value into GitHub or chat.
- [ ] Confirm `MEMBERSHIP_TEST_PORTAL_ENABLED` remains unset or false.
- [ ] Confirm the Stripe TEST price is `price_1Ub4eYKS41qhUQTK2upRvWY9`, GBP 199 pence, monthly, tax inclusive.
- [ ] Confirm endpoint delivery goes to `membership-test-webhook`, not `stripe-webhook` or `stripe-test-webhook`.
- [ ] Confirm there are no live configuration changes and the owner approves performing a simulated purchase.

## Manual sandbox verification sequence (NO REAL PAYMENT)
1. Sign in with a permitted Supabase test account. Verify an unsigned or anonymous request is rejected.
2. Open the test page and confirm all three consent fields must be checked.
3. Use the Stripe TEST checkout page with Stripe's published test-card details only.
4. Confirm the checkout total is £1.99 and the recurring period is monthly. If another total appears, cancel and investigate.
5. Capture Stripe TEST checkout session ID, subscription ID, and signed webhook delivery ID.
6. Verify dedicated webhook returns 200 and Supabase has one `membership_subscriptions` row with `livemode=false`, correct owner, price, status and period.
7. Verify a sandbox membership cannot make `has_active_membership()` return true for production access.
8. Retry an identical signed event once, then check there are no duplicated rows or changes in ownership.
9. Test out-of-order event delivery; ensure current Stripe state wins and stale data cannot grant access.
10. Simulate payment failure, expired period, cancellation and renewal using Stripe's supported sandbox/test-clock workflows. Check every transition against Supabase records.
11. Only after ownership tests, enable the sandbox portal flag; use test portal to cancel and confirm cancellation timing.
12. After tests, return sandbox gates to disabled unless further testing is actively planned.

## Key acceptance criteria
- No account obtains premium access from a failed, unpaid, expired, or test-only transaction.
- No real charge or live recurring price created.
- No sandbox webhook accepts events from live mode or arbitrary price IDs.
- No client-supplied customer ID or price can override server validation.
- Duplicate and out-of-order webhook handling are safe.
- Cancellation works and renewal notices are delivered.
- Existing lifetime £9.99 purchases remain independent.
- Premium lesson content is gated by a server endpoint, not visible public HTML.

## Findings / known limitations as of preparation
- The Stripe TEST £1.99 price is already verified.
- The deployed membership functions exist but have not yet completed a successful signed end-to-end subscription lifecycle.
- The secret names appear in owner screenshots; masked digest does not prove their plain-text values.
- The frontend test entry exists in GitHub, but live GitHub Pages propagation and browser checkout flow have not been verified.
- The current checkout implementation checks an existing subscription row but has a concurrency window before a row exists. Implement a checkout-intent lock or suitable idempotency scheme before production.
- The current public website displays monthly membership but comprehensive server-side premium content protection is unfinished.
- Confirmation email sent status for an earlier £9.99 sandbox course does not prove delivery to recipient's inbox.
- Do not represent this system as live-subscription-ready without a separate final audit and owner approval.

## Stop conditions
Stop immediately if the checkout is not clearly marked TEST, if total differs from £1.99, if a live card/payment is requested, or if there is any unexpected webhook or account ID. Do not retry unrelated webhooks.

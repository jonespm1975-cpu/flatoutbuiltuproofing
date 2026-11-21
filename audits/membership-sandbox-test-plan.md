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
- Fourteen local scenarios passed using mocked Supabase and Stripe services. They covered account ownership, test/live isolation, an already scheduled cancellation, refusal of immediate-cancellation settings, and the redirect to the approved Stripe host. No actual Stripe portal session was opened. Deployment, the membership management action in My Learning and a hosted end-to-end test are pending.

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

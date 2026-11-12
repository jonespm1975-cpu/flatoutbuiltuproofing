# Flat Out Built-Up Roofing — £1.99 membership controlled sandbox test plan
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

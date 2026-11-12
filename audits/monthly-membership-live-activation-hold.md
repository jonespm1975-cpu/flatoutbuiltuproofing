# £1.99 monthly membership — LIVE ACTIVATION HOLD
Prepared 2026-11-12. This is a deployment checklist, not an active billing configuration.

## Verified
- Live Stripe account: acct_1UT8NBKeIprRDTKx
- Existing live product: beginner training course, one-off £9.99.
- Existing live webhook endpoint: https://fhyhshakmvqwzdyannec.supabase.co/functions/v1/stripe-webhook
- Existing webhook only subscribes to checkout.session.completed and checkout.session.async_payment_succeeded; do not repurpose it for subscriptions without a tested separate signing secret.
- No live subscriptions and no £1.99 recurring live price were found at audit.
- Supabase membership_subscriptions table with RLS, and has_active_membership() entitlement function exist.
- My Learning shows server-checked membership status, but subscription payment fulfilment is NOT connected.
- Stripe Tax settings are active with default exclusive tax behavior. Owner must confirm customer-facing £1.99 final price/tax treatment before creation.

## Activation gates — all required
1. Confirm £1.99 is the final amount the customer pays monthly (and tax/VAT treatment), and confirm no VAT registration or tax collection change is required.
2. Create a separate Stripe recurring product/price in GBP with monthly interval. Do not alter existing £9.99 one-off prices.
3. Implement authenticated subscription checkout using Stripe mode=subscription, allowlisted price ID, consent/terms, metadata for user mapping and Stripe Customer Portal cancellation.
4. Create a separate webhook endpoint with its own signing secret for customer.subscription.created/updated/deleted and invoice.paid / invoice.payment_failed; verify raw body signature, event type, account/mode, user mapping, and price against Stripe API; process out-of-order events idempotently.
5. Update membership_subscriptions only from verified server events; do not allow browser writes. Fail closed for incomplete, past_due, unpaid, paused, canceled or expired periods. Define cancel-at-period-end behavior and grace-period policy.
6. Gate the 90%-of-site premium content at the server, not by hiding HTML or links. Preserve separate lifetime access for purchased £9.99 courses.
7. Test subscription purchase, renewal, duplicate/out-of-order webhook, cancellation, payment failure, expiry, customer portal, and refunds in sandbox. Confirm no access without payment.
8. Verify email domain and purchase/subscription messages, UK consumer subscription/cancellation terms, privacy, receipts, and tax wording.
9. Reconcile Stripe prices, webhook delivery logs, and Supabase membership records. Obtain explicit owner approval before enabling any live customer billing.

## Do not do
- Do not create live subscription checkout links, enable live recurring charges, change existing webhook events or existing £9.99 checkout, or expose premium content until gates pass.

## Sandbox progress — 2026-11-12
- Owner confirmed final customer-facing price £1.99 per month inclusive of applicable tax.
- Created Stripe TEST recurring price `price_1Ub4eYKS41qhUQTK2upRvWY9` on test account `acct_1UaPRuKS41qhUQTK`, GBP 199 pence, monthly, `tax_behavior=inclusive`, verified via read-back. This is not a live price.
- Live billing remains on hold. Sandbox subscription checkout, webhook signature secret, event processing and full end-to-end tests are not yet complete. No test charge was made.

## Independent continuation audit — 2026-11-12
- Stripe TEST price: price_1Ub4eYKS41qhUQTK2upRvWY9, 199p GBP, monthly, tax inclusive.
- Stripe TEST webhook endpoint: we_1Ub4iGKS41qhUQTK172Hv2zX (separate from £9.99 one-off webhook).
- Supabase membership-test-checkout deployed but gated by MEMBERSHIP_TEST_CHECKOUT_ENABLED=true.
- Supabase membership-test-webhook v2 deployed but gated by MEMBERSHIP_TEST_WEBHOOK_SECRET and MEMBERSHIP_TEST_FULFILMENT_ENABLED=true.
- Test membership rows have livemode=false; live has_active_membership() explicitly requires livemode=true, active status and unexpired period.
- SQL negative test: wrong Stripe price was rejected; membership row count remained 0.
- Browser members.html displays server-checked membership status, but this does not yet gate the entire premium site.
- BLOCKED: The connected Supabase tools do not offer setting Edge Function secrets. The Stripe-generated signing secret must be securely added in Supabase project Edge Functions Secrets as MEMBERSHIP_TEST_WEBHOOK_SECRET. Never commit it to GitHub or paste it into chat.
- Do not enable test fulfilment until signed webhook delivery and canonical subscription checks are verified.
- Pending: sandbox end-to-end checkout, renewal, cancellation, payment failure, duplicate events, Stripe Customer Portal, Resend delivery and full server-side premium content gates.
- Live billing remains on hold pending explicit owner approval.

## Further safe technical work — 2026-11-12
- Deployed membership-test-webhook v4: when canonical Stripe subscription is active but latest invoice is not paid, synchronize sandbox status as past_due (instead of returning 503 without changing stale state). No live subscription affected.
- Existing live membership access requires livemode=true and status=active; sandbox rows cannot grant live access.
- Sandbox portal bpc_1Ub5FvKS41qhUQTKmsaYiYKB and authenticated membership-test-portal Edge Function v1 are configured but feature-flag disabled.
- GitHub members.html has an explicitly test-only management panel accessible via membership_test=manage; its server endpoint remains gated.
- No evidence yet of successful signed Stripe membership webhook deliveries or completed test purchases; do not mark integration production-ready.
- Residual risk: parallel checkouts can race before a subscription row exists. Production should use a database checkout-intent lock or Stripe idempotency strategy.
- Residual risk: failed-payment transitions and cancellation must be verified against Stripe lifecycle test events; no real charges or live activation authorized.

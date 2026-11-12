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

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


---

# Flat Out Built-Up Roofing — Project progress and handover
**Recorded:** 12 November 2026, 21:24 GMT (Europe/London)
**Website:** https://flatoutbuiltuproofing.co.uk
**GitHub:** https://github.com/jonespm1975-cpu/flatoutbuiltuproofing
**Supabase project:** fhyhshakmvqwzdyannec

## Purpose and scope
UK training and education in traditional three-layer built-up felt roofing. Roofing lead generation remains deferred. Premium black-and-gold website and mobile-friendly My Learning experience. Planned content includes free introductory training, ten paid lessons, tapered/lay-to-fall insulation, tools and safety, working at height, torch-on fire safety, CSCS revision using original material, sponsor and gallery areas, Q&A and community. App Store/Play Store publication is a future milestone, not verified as completed.

## Historical progress
- GitHub Pages website deployed on the custom domain, with HTTPS previously confirmed; index.html, manager.html, lessons/introduction.html and members.html developed.
- Authentication, registration and paid lesson access developed with Supabase. User previously confirmed signing in, opening My Learning and opening a protected paid lesson. This is user-reported, not a fresh production verification.
- £9.99 one-time lesson checkout and lifetime access model prepared. Existing live Stripe arrangements have not been modified in this work.
- Resend domain/DNS work carried out. SPF verification was previously pending/partially verified; purchase-confirmation email delivery remains unverified.
- UK legal pages and consent work drafted/updated historically; final legal and consumer-law review remains outstanding.
- £1.99 per month, tax-inclusive, cancel-anytime membership chosen to replace an earlier £0.50 weekly proposal. Membership has NOT been enabled for live billing.

## Verified or deployed in this work
- Stripe sandbox recurring price price_1Ub4eYKS41qhUQTK2upRvWY9: GBP 1.99 monthly, inclusive tax.
- Stripe sandbox account acct_1UaPRuKS41qhUQTK, webhook we_1Ub4iGKS41qhUQTK172Hv2zX enabled with subscription and invoice events.
- Sandbox billing portal configuration bpc_1Ub5FvKS41qhUQTKmsaYiYKB, allowing cancellation at period end, payment-method updates and invoice history.
- Supabase membership-test-checkout Edge Function v3, with authenticated checkout, consent requirements and existing-membership database check; feature-flag gated.
- Supabase membership-test-webhook Edge Function v4, signature checking, test-mode enforcement, canonical Stripe subscription validation, paid invoice checking and failed-payment past_due mapping; feature-flag gated.
- Supabase membership-test-portal Edge Function v1, authenticated subscription ownership checks; feature-flag gated.
- members.html professional black-and-gold test-only management panel added (GitHub commit 3ac4844e7abe1233ff5fcfe344c7d4935e98e1db).
- Database membership_subscriptions RLS restricts reads to the account owner. apply_membership_test_event EXECUTE privilege only service_role and postgres. Current membership rows: zero (checked 12 November 2026).
- Sandbox membership rows cannot unlock live membership, since has_active_membership requires livemode=true.
- The latest webhook update was deployed; no completed sandbox end-to-end purchase or webhook-delivery verification yet.

## Not completed / blockers
1. In Supabase Edge Function Secrets, set MEMBERSHIP_TEST_CHECKOUT_ENABLED=true and MEMBERSHIP_TEST_FULFILMENT_ENABLED=true for sandbox-only tests. Verify STRIPE_TEST_SECRET_KEY and MEMBERSHIP_TEST_WEBHOOK_SECRET are configured without exposing their values. Keep MEMBERSHIP_TEST_PORTAL_ENABLED disabled until ownership tests pass.
2. Send and verify signed Stripe sandbox subscription events and inspect Supabase webhook logs; test success, failed payment, renewal, cancellation and duplicate checkout. No real charges.
3. Resolve concurrent-checkout idempotency/race risk before production.
4. Integrate server-side membership entitlement with protected content; current membership status does not itself unlock the proposed 90% of learning content.
5. Verify Resend SPF/DNS, purchase confirmation, subscription email and retry delivery.
6. Verify UK legal terms, cancellation consent, accessibility, data protection and subscription disclosures.
7. Perform security/QA checks, production launch readiness and independent approval before any live monthly billing.
8. Mobile store release, additional courses, images/videos and broader content development remain roadmap items.

## Safety and operational boundaries
Do not charge customers, activate live monthly billing, alter live Stripe prices or publish sensitive credentials as part of sandbox testing. Existing £9.99 purchases remain separate. Do not claim complete payment fulfilment until tested.

## Work-mode handoff instruction
Navigate Supabase project fhyhshakmvqwzdyannec -> Edge Function Secrets. Confirm sandbox Stripe test key and webhook secret exist without revealing them. Set MEMBERSHIP_TEST_CHECKOUT_ENABLED=true and MEMBERSHIP_TEST_FULFILMENT_ENABLED=true; leave MEMBERSHIP_TEST_PORTAL_ENABLED disabled. Do not modify any live Stripe payment settings or charge customers. Then test and report signed sandbox events and access control.

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


## Task 7–8 verification — 2026-11-12, 22:28–22:35 GMT
- Independently verified the existing Stripe TEST account `acct_1UaPRuKS41qhUQTK` checkout.session.completed event `evt_1UahMZKS41qhUQTK8J1OszL3` from 2026-11-11 at 19:39:19 UTC, session `cs_test_a0caswbXc3HIkD4VZJRQ7ZZ3W6dT5TICnhxcb0PZ0v1gYUOhHT5v00Ssye`.
- Operator manually retried the failed sandbox delivery in Stripe. Supabase function logs confirm POST 200 to `stripe-test-webhook` at 2026-11-12 22:28:37 UTC. The earlier screenshot showed a prior 503 attempt.
- The webhook created/confirmed the sandbox course entitlement and purchase confirmation. Supabase `purchase_confirmations.confirmation_email_status=sent`, `confirmation_email_sent_at=2026-11-12 22:28:36.658+00`, `confirmation_email_error=NULL`. This is evidence the Resend API submission succeeded, NOT independent inbox delivery.
- Gmail search in the connected `jonespm1975@gmail.com` mailbox found no matching TEST ONLY / sandbox confirmation at audit time. Inspect Resend message status (delivered, bounced, rejected, delayed, or spam) before marking recipient delivery successful.
- The separate `sandbox_email_retry_queue` entry for the same session still reads `pending`, `attempts=0`, `provider_message_id=NULL`. Reconcile/close this stale entry only after checking whether it can trigger duplicate email attempts; do not re-send now.
- Existing £1.99 membership sandbox functions and price are separate. No subscription event end-to-end test was conducted during this verification. Membership rows were zero at the earlier 22:22 audit. Do NOT infer membership checkout/fulfilment readiness from the successful £9.99 test-course confirmation.
- No real charge was created, no live Stripe settings were modified, no production email retry was started. Live monthly billing remains on hold.


## Task 9 — Email retry guard and security check — 2026-11-12
- Read-only SQL join verified the sole sandbox email queue record remains `pending` / zero attempts but its matching purchase confirmation has `confirmation_email_status=sent`; the row is **ineligible** for a send according to the worker's rules. Avoid mutating it until a queue reconciliation procedure is designed and tested.
- Reviewed deployed `purchase-email-retry-worker` v6: it is a dry-run inspector. It explicitly sets `sending_enabled=false`, `claiming_enabled=false`, and `scheduler_enabled=false`; no duplicate email is dispatched by this worker.
- Rechecked `public.has_active_membership()`: requires auth.uid(), livemode=true, status=active and current_period_end > now(). Sandbox subscriptions cannot unlock production membership access through this function. Membership subscription row count remains zero.
- Supabase security advisor: leaked-password protection disabled (WARN); enable using Supabase Auth dashboard settings when supported. Three INFO lint findings for tables with RLS enabled but no policies (`internal.live_purchase_email_outbox`, `public.purchase_confirmations`, `public.sandbox_email_retry_queue`). This is consistent with server-only tables, but privileges and security should be reviewed before modifying any policies.
- No customer payments, emails, live billing changes, schema migrations, or production function deployments were initiated.


## Task 10 — £1.99 membership sandbox static security audit — 2026-11-12
- Inspected deployed `membership-test-checkout` v3, `membership-test-webhook` v4 and `membership-test-portal` v1. Deployed does not prove functional activation or end-to-end readiness; Edge Function secret names/values and enablement flags cannot be enumerated using current connected tools.
- Checkout requires approved origin, signed-in non-anonymous user, three explicit consent booleans, exact allowlisted `price_1Ub4eYKS41qhUQTK2upRvWY9`, and attempts to reject users with an existing matching sandbox membership. Concurrent checkout race remains unresolved.
- Webhook code validates Stripe signature with separate membership test secret, rejects live events, re-fetches canonical subscription and latest paid invoice, validates price/currency/interval/metadata and uses privileged RPC. Implementation has NOT been tested with a signed lifecycle event in this audit.
- Portal has a disabled-by-default feature gate and validates user identity, test subscription owner, customer and price before creating a portal session. End-to-end cancellation test not completed.
- SQL verified `membership_subscriptions` SELECT policy restricts authenticated users to `auth.uid()=user_id`. Only SELECT is granted to authenticated. The SECURITY DEFINER `public.apply_membership_test_event(jsonb)` EXECUTE permissions were checked: anon=false, authenticated=false, service_role=true.
- Server-side comprehensive premium lesson gating and end-to-end sandbox lifecycle (checkout, renewal, failed payment, cancellation, duplication/out-of-order handling) remain blockers to enabling live £1.99 billing.
- No payment, webhook replay, email, function deployment or live setting change occurred during Task 10.


## Task 11 — Stripe/Supabase monthly subscription reconciliation — 2026-11-12
- Read-only inspection of Stripe sandbox account `acct_1UaPRuKS41qhUQTK`: `GET /v1/subscriptions?status=all` returned empty list (`has_more=false`), so there are no subscription objects there at this check.
- Sandbox recurring price `price_1Ub4eYKS41qhUQTK2upRvWY9` retrieved: active, livemode=false, GBP 199 pence, recurring monthly, `tax_behavior=inclusive`.
- Supabase `public.membership_subscriptions`: zero rows (both test and live).
- Stripe event inspection returned prior one-off invoice.paid events but no evidence of subscription-created/updated/deleted or invoice.payment_failed lifecycle for the £1.99 membership.
- No new checkout, real or test purchase, or webhook replay created. Existing sandbox test secrets/flags still cannot be verified through the connected tools; a signed end-to-end checkout and cancellation test is required before declaring readiness.
- Live subscription activation remains blocked.


## Independent safe task completion — 2026-11-12 (after Task 12)
- **Added new** unlinked, noindex page `membership-sandbox-test.html` to main branch in commit `8f12ae7ddf7a4970157e19f222970ea707a8888e`. Its main features: Supabase account verification; explicit recurring billing, terms and cancellation acknowledgements; request to existing authenticated `membership-test-checkout` Edge Function; validated `test_mode=true` and Stripe Checkout HTTPS URL; no card input stored in page. Homepage and live £9.99 payment files unchanged.
- **Added** controlled test plan `audits/membership-sandbox-test-plan.md` in commit `3b11fee42081845652c2d94fa4a394bf98c4b3f1`, covering signed webhook delivery, duplicate/out-of-order events, payment failure, cancellation, renewals and go/no-go conditions.
- **Owner screenshots** confirm the presence (not plaintext values) of `STRIPE_TEST_SECRET_KEY`, `MEMBERSHIP_TEST_WEBHOOK_SECRET`, `MEMBERSHIP_TEST_CHECKOUT_ENABLED` and `MEMBERSHIP_TEST_FULFILMENT_ENABLED` in Supabase Edge Function Secrets. Do not infer the flags are true merely from digest existence.
- SQL recheck confirmed `anon` and `authenticated` cannot execute privileged `apply_membership_test_event(jsonb)` function.
- Attempted external live-page reachability check from current runtime, but network DNS resolution was unavailable. GitHub file contents were successfully read back; GitHub Pages deployment and first checkout remain unverified.
- No test transaction, customer charge, billing configuration change, webhook replay, user entitlement grant, or email was initiated in this action. Keep live monthly billing disabled until final owner approval.


## Sandbox checkout 503 diagnosis and code fix — 2026-11-12, 22:57 GMT onward
- Operator attempted the new unlisted `membership-sandbox-test.html` page with all three consent checkboxes. The frontend showed `Sandbox checkout unavailable`; no real payment occurred.
- Supabase function logs for `membership-test-checkout` showed POST 503 at 22:57:00 and 22:57:06 UTC. Stripe's checkout-session API reported: `Invalid line_items[0]: the product tax code is missing`. Stripe Managed Payments was enabled by default on the TEST account and requires an eligible product tax code.
- As a strictly sandbox-only compatibility fix, redeployed `membership-test-checkout` version 5 adding `managed_payments:{enabled:false}` to its Stripe Checkout Session creation parameters. This is a **session-level test-only override**, not an account setting; it does not modify the Stripe product, recurring price, tax behavior or any live function.
- Read-back verified version 5 is ACTIVE, contains the override, and retains Supabase authentication and `sk_test_` key checks. Membership row count remained 0 after deployment. No new simulated checkout was initiated by the assistant.
- Next: operator may retry private test checkout with Stripe's test card. Inspect logs, then verify signed `membership-test-webhook` and Supabase test-only row. If Stripe reports another error, inspect exact error first. Do not activate live billing.


## First successful £1.99 sandbox payment — 2026-11-12 22:59 GMT; fulfilment pending
- User screenshots show the `membership-sandbox-test.html` checkout successfully opened Stripe Checkout with TEST/Sandbox badge and GBP £1.99 monthly recurring total, submitted simulated test payment, and returned to My Learning.
- Stripe TEST account `acct_1UaPRuKS41qhUQTK` read-back confirmed active subscription `sub_1Ub6xSKS41qhUQTKc7GWuQqT`, `livemode=false`, correct recurring price `price_1Ub4eYKS41qhUQTK2upRvWY9`. Latest invoice `in_1Ub6xPKS41qhUQTKYuPvcjg5` is `paid` for GBP 199 pence.
- Supabase `membership_subscriptions` currently has **no matching row**. The membership webhook endpoint logged four POST HTTP 400 responses at 22:59:08–22:59:24 UTC. This indicates fulfilment webhook delivery was rejected; origin not conclusively identified. Deployed code returns 400 for missing/invalid Stripe signature (or live event), and Stripe event is test mode, so investigate whether the Supabase `MEMBERSHIP_TEST_WEBHOOK_SECRET` matches the dedicated membership destination signing secret. Do not paste either secret into chat or GitHub.
- Live `has_active_membership()` explicitly requires `livemode=true`, so even a correctly synchronized sandbox row must *not* show as active on production My Learning. Add a clearly labeled sandbox-only status query/UI if needed for testing.
- Do **not** create another test subscription. Repair/verify destination signature configuration then retry a relevant failed event only to the dedicated `membership-test-webhook`. Verify HTTP 200, correct Supabase test-only row, and no production membership entitlement before any further lifecycle tests.
- No live payment settings modified, no real money charged, and no extra subscriptions created in this audit.


## Membership webhook secret follow-up — 12 November 2026
- Owner reported saving the dedicated Stripe sandbox webhook signing secret as `MEMBERSHIP_TEST_WEBHOOK_SECRET` in Supabase. The value was not disclosed or verified independently.
- Existing Stripe TEST subscription `sub_1Ub6xSKS41qhUQTKc7GWuQqT` remains active, invoice `in_1Ub6xPKS41qhUQTKYuPvcjg5` remains paid for 199 pence, and subscription price matches the test allowlist. No new payment was created.
- Supabase still has no corresponding `membership_subscriptions` row. Last observed `membership-test-webhook` deliveries returned HTTP 400 around 22:59 UTC, before the owner's secret update; no later webhook invocation yet appears.
- Located the **existing** relevant Stripe TEST event `evt_1Ub6xTKS41qhUQTKOh4fYYQT` (`customer.subscription.created`, subscription `sub_1Ub6xSKS41qhUQTKc7GWuQqT`, `pending_webhooks=1`).
- Connected Stripe API does not expose a targeted webhook delivery retry operation. Next operator action: retry **this event only to the dedicated membership-test-webhook destination** `we_1Ub4iGKS41qhUQTK172Hv2zX`, not the live or £9.99 course endpoint. Verify returned HTTP status in Supabase logs and membership row before further changes. Do not create another subscription.
- Live billing settings untouched and unchanged.


## Membership webhook repaired and verified — 12 November 2026, 23:22 GMT onward
- User manually retried only the existing sandbox `customer.subscription.created` event `evt_1Ub6xTKS41qhUQTKOh4fYYQT` to `membership-test-webhook` after updating the signing secret. Supabase function edge logs independently confirm HTTP 200 at **2026-11-12T23:22:19.664Z**.
- `public.membership_subscriptions` now contains a sandbox-only record for `sub_1Ub6xSKS41qhUQTKc7GWuQqT`, correct recurring price `price_1Ub4eYKS41qhUQTK2upRvWY9`, `livemode=false`, period ending 2026-12-12 22:59:03 GMT.
- A payment-status interpretation bug caused this row to be marked `past_due`, despite Stripe TEST subscription status `active` and invoice `in_1Ub6xPKS41qhUQTKYuPvcjg5` status `paid` with amount_paid=199 GBP pence, total=199, amount_remaining=0, livemode=false. Stripe API version 2025-03-31.basil does not return the older `invoice.paid` boolean, which v7 required.
- Fixed **only** `membership-test-webhook` Supabase Edge Function: deployed ACTIVE version **8**, replacing the removed invoice boolean check with canonical checks of invoice status, mode, currency, remaining amount, paid amount, total, and out-of-band-paid amount. Retained Stripe signature verification, canonical Stripe subscription lookup, allowlisted price, owner mapping, test fulfilment flag and privileged RPC protections.
- Read-back verified v8 is ACTIVE and contains the modified guard. **Existing row remains `past_due` until a subsequent valid signed membership event is delivered**. Do not modify the table manually or bypass signed webhook processing.
- Next safe step: retry the same existing sandbox event only to the membership endpoint (or inspect Stripe's automatic retry) and confirm HTTP 200 plus DB status `active`. Do not create or charge a second subscription; production membership remains disabled.

# Final-stage prelaunch verification — 2026-11-13
Status: HOLD — NOT LIVE-READY.

## Executed checks
- 12/12 read-only static contract assertions passed against staged checkout, proposed webhook and staged purchase page.
- Supabase live database read-only query confirms public.fulfil_live_course_purchase_v4 EXECUTE permissions: anon=false, authenticated=false, service_role=true.
- Live purchase-confirmation enqueue trigger exists and is enabled (tgenabled=O).
- No live payment creation, email sends, entitlement changes, subscriptions changes, homepage changes or deployment occurred during these checks.

## Evidence boundaries
- Static assertions are NOT a Node test runner result, cryptographic signed-event test, real Stripe API test, browser integration test or concurrent database test.
- Earlier rollback-only sequential fulfilment tests passed, but two-connection concurrency remains unverified.
- Legal terms/refunds are DRAFT, purchase checkout UI remains hard disabled.
- Deployed stripe-webhook v31 and checkout v12 remain unchanged. Proposed v32 and staged checkout are not deployed.
- Do not merge draft PR #6 until the staged changes have been executed in a controlled test environment.

## Release-blocking tasks
1. Obtain legal/owner approval of UK digital-content terms, refunds, precontract disclosures, accessibility and durable confirmation.
2. Execute Node contract test suite and browser tests with checkout release gate still disabled.
3. Test actual signed Stripe sandbox event handling, invalid signatures, duplicates, asynchronous paid events and malformed metadata.
4. Run real two-connection DB concurrency tests and verify one receipt/entitlement/email outbox entry.
5. Validate live email worker retry/idempotency, Resend delivery and safe rollback.
6. Reconcile live Stripe webhook configuration, checkout price, approved terms version, secrets and no customer charging in tests.
7. Obtain explicit approval before live activation, deploy controlled release, monitor and verify.

## Safety
Maintain Supabase Free plan and preserve existing subscriptions, customer access and production homepage.

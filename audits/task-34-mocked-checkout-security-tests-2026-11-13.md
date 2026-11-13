# Task 34 — Offline Checkout mock-model and rollback-only database tests
Date: 2026-11-13 UTC
Status: MODEL TESTS PASS; ACTUAL EDGE FUNCTIONS NOT EXECUTED UNDER MOCKS; NOT CERTIFIED END TO END.

## Artifacts
- tests/task-34-sandbox-checkout-model.test.cjs — isolated Node mock-model of Checkout reservation and webhook behavior.
- Deployed checkout v24 and webhook v25 were read back and reviewed. No deployment changes made.

## Test coverage and results
- Existing owner rejected.
- Concurrent/repeated model requests do not increment checkout creation count beyond one; this is an isolated model, NOT a true multi-process database race test.
- Existing open unpaid model session can be recovered without new creation.
- Simulated Stripe creation failure leaves a pending claim; retry does not create a second session.
- Simulated Stripe-success/database-attachment failure leaves a pending claim; retry does not create a second session.
- Duplicate paid webhook events create one modeled entitlement and one modeled receipt/email.
- Mismatched user webhook denied.
- Local Node mock-model checks passed. The uploaded GitHub test is an independent model; no actual Stripe/Supabase network requests.
- Rollback-only SQL verified owned, create_once and pending states. Post rollback reservation_count=0, course_access_count=2, membership cancellation true.

## Known limitations
- Actual deployed Edge Functions were NOT executed with dependency-injected mocks, and Stripe signature verification was NOT exercised.
- Local model's concurrent interleaving is not a substitute for concurrent transactions against Postgres.
- Webhook's receipt/email idempotency is more complex than the model and needs real dependency-injected tests.
- Actual COURSE_TEST_CHECKOUT_V2_ENABLED secret value is unverified.
- Pending claims remain fail-closed and require manual Stripe investigation.
- No Checkout sessions, payments, subscription changes, live billing activation, homepage changes or Supabase plan upgrade.

## Next
Implement an isolated harness that executes the actual checked-in TypeScript Edge Function source with mocked Stripe/Supabase clients, verify concurrent Postgres transactions, and test webhook duplicate delivery with mocked persistence before certifying activation.

# Task 33 — Sandbox Checkout security and webhook compatibility
Date: 2026-11-13 UTC
Status: SAFE SANDBOX WEBHOOK RECONCILIATION DEPLOYED; ACTIVATION/END-TO-END TESTS PENDING.

## Reviewed
- stripe-test-checkout v24: JWT validated via auth.getUser; consent booleans required; service-role-only atomic reservation RPC; stable Stripe idempotency key; original session recovery requires matching client_reference_id and metadata, livemode=false, mode=payment, status=open, payment_status=unpaid. Fail-closed on uncertainty.
- stripe-test-webhook v24 verified Stripe signature and sandbox event, price line items, course metadata, customer, payment status; granted idempotent course_access but did not reconcile reservation state.
- Three service-role-only RPCs have SECURITY DEFINER and EXECUTE denied to anon/authenticated; reservation table RLS enabled with no public policies (intentional).
- Supabase security advisor reported INFO RLS-without-policy for five internal/server tables (intentional on reservation) and WARN leaked password protection disabled. No auth configuration changed.
- Actual COURSE_TEST_CHECKOUT_V2_ENABLED value not available via connected tools; activation cannot be certified.

## Fix deployed
- Added public.mark_test_course_checkout_fulfilled(uuid,text,text) service-role-only RPC. Requires existing course entitlement, exact user/course and matching cs_test_ reservation session ID; updates only matched reservation to fulfilled.
- Deployed stripe-test-webhook v25. After successful idempotent course_access upsert, invokes reconciliation RPC. Legacy sandbox events without a reservation are unaffected. Reconciliation errors logged; no new payment or checkout creation.
- Archived deployed webhook source at supabase/functions/stripe-test-webhook/task-33-v25-index.ts.

## Rollback-only tests
- No entitlement: fulfillment denied.
- Wrong session ID: fulfillment denied.
- Existing entitlement + matching reservation session ID: fulfilled.
- ROLLBACK left reservation_count=0 and course_access_count=2; membership cancel_at_period_end remains true.
- Anonymous EXECUTE of fulfillment RPC denied.
- No Stripe webhook event replay, checkout session creation, payment, subscription mutation, homepage modification or Supabase plan change.

## Remaining risks / next gates
- Confirm actual V2 activation flag without exposing secrets.
- End-to-end webhook and Checkout HTTP tests not performed because no new sessions/payments authorized.
- Failed Stripe session creation leaves a durable pending claim, intentionally requiring manual reconciliation. Stripe idempotency retention window does not justify automatic reset.
- Verify production Auth leaked-password protection availability and plan implications before enabling.
- Run controlled mocked integration harness for all branches and verify source against deployment.
- Do not activate live billing or claim complete payment certification.

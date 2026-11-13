# Task 30 — sandbox Checkout reservation integration
Date: 2026-11-13 UTC
Status: CODE DEPLOYED BEHIND ADDITIONAL FAIL-CLOSED FLAG; NO PAYMENT OR SESSION TESTS.

## Deployment
- Supabase stripe-test-checkout version 23, code archived at supabase/functions/stripe-test-checkout/task-30-v23-index.ts.
- New separate gate COURSE_TEST_CHECKOUT_V2_ENABLED must equal 'true'; no flag was set or changed in this task. Actual secret configuration could not be independently inspected, so do not assert flag is absent.
- Existing sandbox flag remains required; live checkout untouched.
- After JWT authentication and consent checks, service-role RPC reserve_test_course_checkout checks ownership and atomically claims the course.
- Owned returns HTTP 409. Concurrent or repeated pending claim returns HTTP 409, without another Stripe call. A session_created claim also fails closed, rather than creating a second session.
- First claim alone is eligible for Stripe Checkout creation using idempotencyKey course-test-v2-<reservation_key>; session ID attached via service-role-only RPC.
- On Stripe uncertainty or failed database attachment, reservation is retained and no automatic second Checkout creation is attempted.
- Existing reservations are never automatically recycled, even past expires_at, preventing stale-session duplicate charges at cost of manual recovery.

## SQL adjustments
- reserve_test_course_checkout returns create_once for first claim, pending for subsequent claim, owned for entitlement; advisory transaction lock and unique PK.
- attach_test_course_checkout_session accepts creating status; both RPCs have EXECUTE revoked from anon/authenticated and granted to service_role.
- No existing customer access, payment, subscription or checkout record was modified.

## Tests
- First rollback-only test exposed attach RPC status mismatch; corrected and reran.
- Second rollback-only test PASSED: existing owner blocked; first synthetic request create_once; repeat pending with same UUID; mock session attach true; subsequent claim session_created.
- Post rollback: reservations 0; course_access rows 2; membership cancel_at_period_end true.
- Retrieved deployed v23 source and verified it contains both rollout flag and idempotencyKey.
- No Stripe sessions or charges created; no end-to-end HTTP/Stripe tests run.

## Important remaining work
- Confirm actual COURSE_TEST_CHECKOUT_V2_ENABLED secret state before any customer test; no direct secret listing available.
- Add support/admin reconciliation for pending claims and existing session URLs. The current fail-closed design prevents duplicates but can block checkout indefinitely after uncertain errors.
- Review potential refund/customer support policy for historical duplicate purchases.
- Independently verify behavior via HTTP in controlled sandbox only after explicit permission to create sessions, or use isolated mocked harness. Do not claim end-to-end proof.
- No live billing activation, homepage changes or Supabase plan upgrade.

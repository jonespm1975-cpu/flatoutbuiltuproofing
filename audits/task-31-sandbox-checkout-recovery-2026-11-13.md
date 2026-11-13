# Task 31 — Sandbox Checkout recovery audit
Date: 2026-11-13 UTC
Status: READ-ONLY RECOVERY CODE DEPLOYED; LIVE FLAG VALUE UNVERIFIED; NO STRIPE SESSION TEST.

## Verified
- Existing checkout reservations: 0 before and after rollback-only tests.
- Deployed stripe-test-checkout v24; source archived at supabase/functions/stripe-test-checkout/task-31-v24-index.ts.
- When claim result is session_created, endpoint now retrieves the original Stripe sandbox Checkout session by stored ID. Requires livemode=false, mode=payment, matching client_reference_id and metadata user/course. Returns original URL only when status=open and payment_status=unpaid.
- Paid, expired, mismatched, missing, or Stripe API-error cases fail closed without creating a replacement session.
- Claim 'pending' still fails closed and needs support intervention. Recovery cannot reconstruct a Stripe session if the original Stripe create succeeded but session ID was not persisted; do not reset reservations blindly.
- Existing separate COURSE_TEST_CHECKOUT_V2_ENABLED gate remains required. The connector cannot list Supabase secret values or flag names, so actual enabled/disabled state could not be verified; no secret was revealed or changed.
- SQL rollback assertions passed: existing owner blocked, first synthetic reservation create_once, repeat pending, mock attach, later session_created. No Stripe API session creation.
- Post-test: 0 reservations, 2 existing entitlements, existing membership cancellation true.
- No live billing changes, no real or test payments, no homepage changes or plan upgrade.

## Remaining
- Verify activation gate from Supabase Edge Function Secrets in an authorized interface, without revealing values.
- Mock-test read-only Stripe retrieve branch and full HTTP behavior, or use a known existing sandbox session mapped to a controlled reservation without altering customer data.
- Add manual admin reconciliation procedure for 'pending' and terminal session states; no automated claim reset until original session is proven nonpayable.
- Do not claim end-to-end recovery verified.

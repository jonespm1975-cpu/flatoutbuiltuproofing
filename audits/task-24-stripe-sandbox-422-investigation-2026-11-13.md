# Task 24 — Stripe sandbox HTTP 422 investigation
Date: 2026-11-13 00:37 GMT (investigation started; timestamps UTC)
Scope: read-only inspection; no payment, event replay, secret changes, billing activation, subscription mutation or deployment.

## Verified
- Supabase project fhyhshakmvqwzdyannec, function stripe-test-webhook ACTIVE version 24 at inspection.
- Three Stripe-user-agent POST HTTP 422 responses on 2026-11-12 UTC at 22:59:08.483 (request 01a1d1fc-7de0-78ed-b0c2-fbe4b52c2cc6; deployment v20), 22:59:23.011 (request 01a1d1fc-b816-7322-955b-bd142a5a14e8; deployment v20), 23:58:20.354 (request 01a1d232-b094-772b-a0df-d12ca3a14948; deployment v23).
- All requests targeted /functions/v1/stripe-test-webhook, content_length 4325. Same size suggests possible retries of the same event, but DOES NOT establish identical event ID or exact validation failure.
- Current v24 code signature-verifies Stripe events, ignores subscription-mode Checkout with 200, requires test mode, and rejects customer mapping (422), checkout metadata/consent mismatch (422), price mismatch (422), unknown user (422). No sensitive payloads were exposed.
- Current v24 returns 503 when STRIPE_TEST_UNLOCK_ENABLED is not true; 422 is distinct from this flag gate.
- Historical handover documents successful 200 retry for an older 2026-11-11 checkout.session.completed test event on 2026-11-12 22:28:37; it does NOT prove these later three 422s recovered.
- Database public.membership_subscriptions count was 1 at inspection. Existing subscription was not changed.
- Stripe TEST account identified as acct_1UaPRuKS41qhUQTK; live account separate acct_1UT8NBKeIprRDTKx.

## Unverified / next safe work
1. In Stripe sandbox Workbench inspect delivery attempt details for the three timestamps, capture event IDs, checkout session IDs, response bodies, and whether attempts are retries. Match request IDs and deployment versions.
2. Retrieve canonical Checkout session and line items read-only; compare client_reference_id, mode, payment_status, GBP totals, metadata consent, user existence, allowed price.
3. Do not loosen fail-closed validation or automatically replay unknown events. If events are invalid, record expected rejection; if valid, fix the verified mismatch with targeted tests.
4. After verifying event identity and current entitlement/receipt state, retry only the appropriate existing sandbox delivery to stripe-test-webhook, with idempotency checks; never membership or live endpoints.
5. Verify Supabase course_access and purchase_confirmations after any authorized safe retry, and Resend delivery separately.

## Safety
Live billing unchanged. No payment created. No Stripe delivery replay performed. No Supabase function deployed. No change to existing subscription cancellation. Supabase Free plan preserved. Status: PARTIAL — root cause not yet proven; do not mark resolved.

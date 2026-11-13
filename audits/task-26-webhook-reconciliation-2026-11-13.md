# Task 26 — sandbox webhook recovery and entitlement reconciliation
Date: 2026-11-13 GMT. Status: PARTIALLY VERIFIED, no replay or deployment.

## Verified
- Stripe TEST checkout event evt_1Ub6xTKS41qhUQTKCAsjwHU2 created 2026-11-12 22:59:07 UTC, subscription mode, 199p, paid, pending_webhooks=1.
- Course webhook HTTP 422: 22:59:08.483 (v20), 22:59:23.011 (v20), 23:58:20.354 (v23). Per-attempt event IDs and response bodies unavailable from connected tools; all three cannot be definitively attributed to that event.
- Membership webhook HTTP 400 near 22:59; subsequent HTTP 200 at 23:22, 23:28, 23:36, 23:58, 23:59 UTC. Per-event processing not independently established.
- Deployed course webhook v24 has signed-event verification and early HTTP 200 acknowledgement for subscription-mode Checkout, before any course grant. No v24 retry observed.
- Membership webhook v9 verifies test-mode signatures, canonical subscription, £1.99 allowlisted price, customer mapping and invoice evidence.
- Stripe subscription sub_1Ub6xSKS41qhUQTKc7GWuQqT: active, test mode, cancel_at_period_end=true, price price_1Ub4eYKS41qhUQTK2upRvWY9, quantity 1, ends 2026-12-12 22:59:03 UTC. Supabase membership record agrees. Zero live membership rows.
- Supabase: two course_access rows, one purchase confirmation with email_status=sent, no duplicate user/course pairs. The confirmation matches an entitlement by user/course.
- IMPORTANT: the purchase confirmation session ID differs from the corresponding course_access session ID. Could reflect an earlier idempotent grant and later purchase; reconcile both canonical Stripe sessions before changing anything.

## Pending
- Obtain Stripe Workbench delivery-attempt event IDs, response bodies and destinations for each 422.
- Verify signed redelivery to the course webhook only if event identity and destination are confirmed; never send to live or membership endpoints indiscriminately.
- Reconcile mismatched receipt and entitlement session IDs, and verify email delivery separately.

## Safety
No payment or checkout created, no event retried, no function deployed, no SQL mutation, no live billing change, no cancellation change, no Supabase upgrade. Do not mark the three 422s resolved yet.
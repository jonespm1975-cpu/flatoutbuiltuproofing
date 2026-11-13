# Task 25 — Stripe sandbox 422 event correlation
Date: 2026-11-13 GMT
Status: PARTIALLY VERIFIED; no replay required without delivery-level confirmation.

## Stripe API evidence
- Connected Stripe TEST account acct_1UaPRuKS41qhUQTK (not live account).
- List of all checkout.session.completed events returned five records; latest evt_1Ub6xTKS41qhUQTKCAsjwHU2 was created 2026-11-12 22:59:07 UTC.
- Its Checkout session cs_test_a04ZHXq0Z9NAXC09vZaAkXHgZcpxLDfy56fZLBqYbISkbnyNoAVGnvlhpu had mode=subscription, payment_status=paid, amount_total=199 GBP minor units, metadata membership=monthly-learning and mode=test, pending_webhooks=1 at inspection.
- Stripe's delivery_success=false listing returned this event and an older 2026-11-11 one-off payment event. Stripe API available in this session did not expose individual delivery attempts or response bodies.

## Supabase evidence
- 422 to stripe-test-webhook at 22:59:08.483 UTC, 22:59:23.011 UTC, and 23:58:20.354 UTC on 2026-11-12.
- The 22:59:08 failure follows the subscription event by ~1.5 seconds; the three HTTP requests have the same 4325-byte content length. Strong circumstantial evidence of a repeated misrouted subscription event, NOT conclusive event-ID-level correlation.
- Failures were on deployment versions 20, 20, and 23. Current deployed stripe-test-webhook is version 24, whose code returns HTTP 200 for signed test subscription Checkout events before course-only validation, while preserving course entitlement security checks.
- Current public.purchase_confirmations grouped by confirmation_email_status returned one 'sent' record; this is provider-submission state, not inbox delivery confirmation.
- A separate earlier SQL check counted one membership record; it was not modified.

## Assessment and safe handling
Likely root cause: Stripe delivered the £1.99 subscription checkout event to the £9.99 course webhook, and older deployments rejected it with 422. Current v24 has the necessary early mode=subscription ignore/acknowledge path. Do NOT attempt to grant a £9.99 course entitlement from this subscription event. Do NOT replay the event to the membership webhook manually without confirming the membership event subscriptions and existing record state.
No deployment made: a speculative code change is not justified by the evidence. No event retry made: Stripe delivery-attempt endpoint/response body not accessible through available connector. Verify original delivery attempts in Stripe Workbench and, if needed, retry the existing signed sandbox delivery only to its correct destination after checking idempotency.
No new payment, live billing change, Supabase plan change, or subscription cancellation change.

## Remaining proof
1. Inspect Stripe Workbench event delivery attempts at 22:59:08, 22:59:23 and 23:58:20, confirm all event IDs and exact response text.
2. Check the current course webhook's HTTP 200 acknowledgement for a future authorized redelivery of the original subscription event (do not initiate payment).
3. Confirm membership-test-webhook delivery independently and that paid subscription lifecycle is handled only there.
4. Confirm no duplicate course entitlement and verify email delivery separately.

Conclusion: probable mismatch isolated, existing deployed guard verified by code inspection; full end-to-end recovery NOT proven.

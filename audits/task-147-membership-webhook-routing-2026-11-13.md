# Task 147 — Membership webhook routing review (2026-11-13 UTC)

## Verified deployed code
Supabase project fhyhshakmvqwzdyannec, membership-test-webhook version 9. Its accepted event types are customer.subscription.created/updated/deleted, invoice.paid and invoice.payment_failed. All other validly signed sandbox event types, including checkout.session.completed, receive HTTP 200 'Ignored'. Signature validation occurs before this event-type filter, and invalid signatures receive HTTP 400. Live-mode events also receive HTTP 400. Therefore an HTTP 400 alone cannot prove a signing-secret mismatch. The code requires MEMBERSHIP_TEST_FULFILMENT_ENABLED=true for accepted event types, retrieves current canonical subscription state from Stripe, checks expected monthly GBP 1.99 price and customer mapping, and checks latest invoice evidence before applying active access.

## Historical observations
At 2026-11-12 22:59 UTC, membership-test-webhook recorded HTTP 400 while stripe-test-webhook recorded HTTP 422 near the same timestamps. This is correlation only; neither request payload nor event ID is available in the queried Supabase logs. Current course webhook version 25 returns HTTP 200 for validly signed sandbox subscription checkout events, but current code cannot establish what historical deployed code did at the time.

## Unresolved
Obtain original Stripe Workbench delivery attempt IDs, destination, response body, event IDs, signing context, and historical deployment versions. Confirm whether 400 means invalid signature or live-mode rejection; confirm which course 422 validation failed. No direct Resend provider record available in connected tools, so inbox delivery remains unverified. No webhook replay or email resend authorised.

## Safety
Read-only investigation; no emails, charges, checkout sessions, deployment or changes to live billing, subscriptions, entitlements, homepage, or Supabase Free plan.

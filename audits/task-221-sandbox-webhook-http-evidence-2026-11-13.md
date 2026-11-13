# Task 221 — Stripe endpoint and HTTP response verification — 2026-11-13

Read-only evidence:
- Stripe sandbox account acct_1UaPRuKS41qhUQTK has enabled course endpoint we_1UaQFlKS41qhUQTKYZN8OMoR at /functions/v1/stripe-test-webhook, subscribed to checkout.session.completed and checkout.session.async_payment_succeeded.
- Separate enabled membership endpoint we_1Ub4iGKS41qhUQTK172Hv2zX at /functions/v1/membership-test-webhook; subscribed to subscription and invoice lifecycle events.
- Supabase function_edge_logs, 2026-11-12 UTC, show course webhook:
  - 22:28:37.008 POST 200
  - 22:59:08.483 POST 422
  - 22:59:23.011 POST 422
  - 23:58:20.354 POST 422
- These are observed HTTP responses, not independently joined to Stripe event IDs or verified Stripe signature outcomes.
- Current sandbox handler can return 422 for invalid customer mapping, checkout mismatch or price mismatch; endpoint log alone cannot distinguish them.
- No event retries, Stripe payments, email sends, or live settings changes were made.

Remaining: match exact event IDs to Stripe delivery attempt details; independently test cryptographic signature accept/reject with controlled fixtures; reconcile provider Resend status; prove simultaneous claim contention.

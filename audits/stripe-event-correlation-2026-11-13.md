# Stripe sandbox historical event correlation — 2026-11-13
Read-only Stripe GET /v1/events, GET /v1/webhook_endpoints and Supabase function logs. No event resend.

## Verified Stripe test events
- 2026-11-12T22:59:07Z evt_1Ub6xTKS41qhUQTKCAsjwHU2 checkout.session.completed, mode=subscription, livemode=false, amount_total=199 GBP, metadata membership=monthly-learning and mode=test; valid UUID client_reference_id present. Session cs_test_a04ZHXq0Z9NAXC09vZaAkXHgZcpxLDfy56fZLBqYbISkbnyNoAVGnvlhpu.
- 2026-11-12T22:59:07Z evt_1Ub6xTKS41qhUQTKOh4fYYQT customer.subscription.created, livemode=false, item price_1Ub4eYKS41qhUQTK2upRvWY9 unit_amount=199 GBP; matching membership metadata.
- 2026-11-12T22:59:06Z evt_1Ub6xTKS41qhUQTKqoUvk7ls invoice.paid, livemode=false.
- Other related invoice/payment events exist; 13 test events in queried period.

## Enabled Stripe test webhook endpoints
- we_1Ub4iGKS41qhUQTK172Hv2zX -> /functions/v1/membership-test-webhook; subscribed customer.subscription.created/updated/deleted, invoice.paid, invoice.payment_failed.
- we_1UaQFlKS41qhUQTKYZN8OMoR -> /functions/v1/stripe-test-webhook; subscribed checkout.session.completed and checkout.session.async_payment_succeeded.

## Supabase logs
- membership-test-webhook HTTP 400 at 22:59:08.383 (two entries), 22:59:22.696, 22:59:24.712.
- stripe-test-webhook HTTP 422 at 22:59:08.483, 22:59:23.011.
- Source membership-test-webhook v9 returns 400 for invalid signature or live event; the listed events are test-mode, so an event-specific delivery ID, response body and endpoint signature configuration are required to establish cause.
- Source stripe-test-webhook v25 explicitly ignores subscription checkout mode with HTTP 200. Therefore the 422 log responses cannot confidently be attributed to the retrieved subscription checkout event without delivery IDs and response bodies. Do not assume that Stripe event creation time equals exact webhook delivery identity.

## Safe next step
Retrieve Workbench delivery attempt IDs/response bodies for the named event IDs and endpoint IDs. Compare endpoint-specific signing secret mappings without revealing secret contents. Do not relax signature validation, retry events, send emails, create payments, modify entitlements or deploy until root cause is verified.

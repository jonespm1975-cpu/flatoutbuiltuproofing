# Stripe sandbox event and webhook destination inspection — 2026-11-13

Read-only Stripe API and Supabase SQL; no event replay.

- Event `evt_1UahMZKS41qhUQTK8J1OszL3`: `checkout.session.completed`, paid £9.99, expected beginner course and consent metadata, event API version `2026-09-30.endive`, `pending_webhooks=0`. Zero pending is **not** proof of successful HTTP delivery.
- Sandbox webhook destination `we_1UaQFlKS41qhUQTKYZN8OMoR`: enabled, targets `stripe-test-webhook`, subscribes to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- Sandbox membership destination `we_1Ub4iGKS41qhUQTK172Hv2zX`: enabled, targets `membership-test-webhook`, subscribes to subscription and invoice events; no course checkout events.
- The Stripe GET Event and GET Webhook Endpoints responses do not contain historical HTTP response bodies for specific delivery attempts. Workbench delivery attempt history is still required.
- Supabase confirmation for event session suffix `5v00Ssye`: `confirmation_email_status=sent`, sent timestamp present, `terms_version=sandbox-test`; sandbox email queue `status=accepted`, `attempts=0`, provider message ID absent. **No independent Resend delivery confirmation.**
- Course entitlement for that session remains absent; do not backfill until webhook response/version and payment/consent checks are reviewed.

## Holds
No live billing, subscriptions, entitlements, email sends, Stripe payments or Checkout sessions modified. Do not retry historical delivery until original outcome is resolved.

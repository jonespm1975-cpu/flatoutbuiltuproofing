# Stripe sandbox webhook routing audit — 2026-11-13
Read-only Stripe GetWebhookEndpoints (sandbox account acct_1UaPRuKS41qhUQTK).

1. Membership endpoint we_1Ub4iGKS41qhUQTK172Hv2zX: status=enabled, livemode=false, URL /functions/v1/membership-test-webhook. Enabled events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed. Description states "Sandbox only £1.99 membership lifecycle; fulfilment disabled until signing secret configured." This is descriptive metadata, NOT a current flag or secret verification.
2. Course endpoint we_1UaQFlKS41qhUQTKYZN8OMoR: status=enabled, livemode=false, URL /functions/v1/stripe-test-webhook. Enabled events: checkout.session.completed and checkout.session.async_payment_succeeded. Description states "sandbox only; test lesson checkout; unlocking disabled." Also not current runtime proof.
3. The endpoints' event lists are different: a subscription-mode checkout.session.completed can be routed to the course endpoint even though it is a membership checkout. The current course webhook v25 intentionally ignores signed subscription-mode checkout sessions with HTTP 200, but historical failed HTTP 422 occurred under v20, whose exact logic is not yet established. This is a plausible historical routing/validation conflict, NOT an established root cause.
4. Historical HTTP 400 membership requests used v5, not current v9. Delivery response body and historical function source still needed for diagnosis.
5. Resend provider history remains unavailable; receipt marked sent and retry queue accepted without provider ID. Do not resend.

Release gates remain blocked. No endpoint changes, events replayed, emails sent, payments, subscriptions, entitlements, homepage, Supabase plan, or live billing modified.

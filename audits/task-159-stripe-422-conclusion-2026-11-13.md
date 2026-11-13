# Task 159 — Stripe 422 investigation conclusion (2026-11-13)

## Final disposition: code review closed; historical delivery attribution unconfirmed

The three historical course webhook HTTP 422 responses at 2026-11-12 22:59:08.483, 22:59:23.011, and 23:58:20.354 UTC occurred on deployments v20, v20 and v23. All had request content-length 4325. Stripe event evt_1Ub6xTKS41qhUQTKCAsjwHU2 was created 22:59:07 UTC, checkout.session.completed, mode subscription, subtotal/total 199 pence, and lacked the course-specific metadata required by the course handler. This is the leading explanation, not a proven event-to-attempt match.

Re-read currently deployed functions on 2026-11-13: stripe-test-webhook v25 ACTIVE; it verifies Stripe signatures and acknowledges subscription checkout with HTTP 200 before course checks and without granting course access. membership-test-webhook v9 ACTIVE; it verifies Stripe signatures and includes customer.subscription.created, updated, deleted, invoice.paid and invoice.payment_failed handling. This confirms present code routing only; no new signed integration event was delivered or replayed.

## Decision
No speculative code modification or deployment. Close the historical webhook routing code-review task as 'safeguard present; historical attribution unconfirmed'. Keep independent external delivery-attempt reconciliation as optional evidence follow-up, not as a reason to make an untested production change. Resend provider-side delivery verification and genuine isolated two-session PostgreSQL concurrency tests remain separate open tasks; neither is claimed complete.

No emails, payments, Checkout sessions, webhook replays, subscription modifications, entitlement changes, database writes or production deployments.

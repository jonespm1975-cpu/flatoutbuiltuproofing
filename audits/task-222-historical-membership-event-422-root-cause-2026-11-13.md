# Task 222 — Historical Stripe HTTP 422 cause — 2026-11-13

## Verified from Stripe TEST account
Event evt_1Ub6xTKS41qhUQTKCAsjwHU2 is checkout.session.completed, created 2026-11-12 22:59:07 UTC, livemode=false, session.mode=subscription, amount_total=199 GBP, metadata membership=monthly-learning. Stripe reports pending_webhooks=1 at read time.

## Supabase function_edge_logs
Course webhook returned 422 at 22:59:08.483, 22:59:23.011 and 23:58:20.354 UTC. All three have request content_length=4325, Stripe/1.0 user agent. The first response follows subscription event creation by ~1 second. Earlier successful POST 200 at 22:28:37 has length 4846.

## Root-cause assessment
High-confidence correlation: the £1.99 membership checkout was delivered to the course webhook because its endpoint listens to all checkout.session.completed events; older course-only validation returned 422 on subscription mode or missing course consent. Identical lengths across three 422 requests support retries of the same event. The logs do not expose Stripe event IDs in request records, so exact per-request linkage is not cryptographically established.

## Current source
Installed stripe-test-webhook v25 explicitly detects session.mode=subscription and returns HTTP 200 without granting course access. This code is newer than historical deployment versions 20/23 observed for the rejected calls. Do not replay or create payments as part of this audit.

## Follow-up
Confirm whether Stripe automatically retries historical delivery to the current v25 handler; inspect webhook delivery status from Stripe Workbench if API lacks per-attempt details. Do not resend manually without explicit instruction. Keep production unchanged.

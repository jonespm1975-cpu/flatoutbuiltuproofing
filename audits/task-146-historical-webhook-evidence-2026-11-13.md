# Task 146 — Historical sandbox webhook investigation (2026-11-13 UTC)

## Scope
Read-only investigation. No payments, email sends, retries, deployments, billing changes, subscription changes or entitlement changes.

## Confirmed Supabase observations
Project: fhyhshakmvqwzdyannec. On 2026-11-12 UTC, function_edge_logs recorded HTTP 422 POST responses from stripe-test-webhook at 22:59:08.483, 22:59:23.011 and 23:58:20.354. At 22:59:08.383, 22:59:22.696 and 22:59:24.712 membership-test-webhook returned HTTP 400. Membership-test-webhook returned HTTP 200 at 23:22:19.664, 23:28:33.749, 23:36:52.235, 23:58:49.776 and 23:59:47.623. These timestamp correlations do NOT prove identical Stripe event IDs or request payloads.

At 22:57:00 and 22:57:06 membership-test-checkout logs reported a missing product tax code for Managed Payments and returned HTTP 503. At 22:58:55 membership-test-checkout returned HTTP 200. Do not assume the 503 problem remains active.

## Stripe sandbox events and prices
Account acct_1UaPRuKS41qhUQTK, test mode. Retrieved checkout.session.completed events include evt_1Ub6xTKS41qhUQTKCAsjwHU2 (subscription, GBP 1.99), evt_1UahMZKS41qhUQTK8J1OszL3 (course, GBP 9.99), evt_1UaRIMKS41qhUQTK4K5PgF7C (course, GBP 9.99), evt_1UaRAZKS41qhUQTKOFPReXfd (course, GBP 11.99), and evt_1UaR5FKS41qhUQTK9ekgoE4b (course, GBP 11.99). These are event candidates, NOT confirmed matches to the three HTTP 422 deliveries. Historical 11.99 checkout used price_1UaPSRKS41qhUQTK2BbUBUTf, unit GBP 9.99, tax GBP 2.00 additional. Newer 9.99 checkout used price_1UaRCSKS41qhUQTKl2uSNnYN, tax inclusive, GBP 1.67 included.

## Deployed webhook observations
stripe-test-webhook version 25 handles subscription checkout.session.completed as an ignored event with HTTP 200; course checkout 422 can be returned for customer mapping, checkout metadata/amount/currency, price line-item, or unknown user. A 422 request cannot be assigned a particular reason from status alone. Historical deployed versions may differ from current code.

## Email evidence
Supabase purchase_confirmations has one sandbox record with confirmation_email_status=sent and confirmation_email_sent_at=2026-11-12 22:28:36.658+00. sandbox_email_retry_queue has status=accepted, attempts=0 and provider_message_id=NULL. Current stripe-test-webhook marks sent after an HTTP success from Resend, but does not persist Resend's provider message ID. This establishes API acceptance at most, NOT recipient delivery. No direct Resend delivery record has been retrieved.

## Open verification blockers
1. Obtain Stripe Workbench delivery attempt IDs, response bodies, destination names, event IDs and delivery times for the three 422 responses; map to historical deployed webhook versions. Stripe event listing alone does not expose the delivery attempt mapping.
2. Retrieve provider-side Resend message ID and delivered/bounced status, without resending.
3. Prepare and review a backward-compatible patch to persist provider message IDs and distinguish accepted from delivered, with idempotency and sandbox-only tests before any deployment.

## Safety
Preserve live billing, existing subscription cancellation, entitlements, homepage and Supabase Free plan. No sends, payments or checkout sessions. Do not replay webhook events until explicitly approved.

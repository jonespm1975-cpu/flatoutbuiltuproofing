# Task 154 — Historical delivery, Resend evidence, and database concurrency readiness
Date: 2026-11-13 UTC. Read-only investigation.

## Stripe endpoints independently verified
Stripe sandbox account acct_1UaPRuKS41qhUQTK has two enabled webhook endpoints. Course destination we_1UaQFlKS41qhUQTKYZN8OMoR subscribes only to checkout.session.completed and checkout.session.async_payment_succeeded, and targets stripe-test-webhook. Membership destination we_1Ub4iGKS41qhUQTK172Hv2zX subscribes to customer.subscription.created/updated/deleted and invoice.paid/invoice.payment_failed, and targets membership-test-webhook. These configured event subscriptions do not overlap. The connected Stripe API operation catalog did not return an event delivery attempts listing endpoint; therefore the three historical 422s cannot yet be matched to event IDs or response bodies. Do not infer event identity from timestamps.

## Resend independent verification status
No direct Resend account connector is available in the connected tool catalog. Read-only Supabase query showed one matching sandbox queue/confirmation record: queue status=accepted, attempts=0, provider_message_id absent, confirmation_email_status=sent, timestamp present. This is not provider-side delivered/bounced evidence. It cannot independently confirm Resend inbox delivery. Avoid further sends or retries until message identity and idempotency are established.

## Actual database function review
Inspected installed internal.claim_sandbox_email_retry_v2 and internal.finish_sandbox_email_retry_v3 definitions. Claim uses SELECT ... FOR UPDATE OF q SKIP LOCKED with a five-item limit, five-minute lease, new random lease token and attempt increment. Finish requires matching session and token, unexpired lease, sandbox-only receipt pending, and nonempty provider ID for accepted result; updates queue and receipt in one SQL statement under row locks. These are appropriate structural safeguards, but inspection is NOT an actual two-connection race test. Current only queue row is already accepted, so a claim against it should not alter it; do not use real data to simulate contention.

## Required remaining actions
1. Retrieve historical event delivery attempt detail from Stripe Workbench (event ID, destination, timestamp, response body) with read-only navigation; no replay.
2. Use Resend dashboard/API with authorized account access to look up provider message ID and delivered/bounced status; currently no provider ID in Supabase.
3. Provision a separate isolated database with two independent SQL connections, install matching SQL functions and synthetic fixtures, and run genuine simultaneous claims, stale token, expiry, retry and rollback tests. Never use production customer rows.
4. Only after tests, review a non-deployed patch for redacted diagnostics and provider ID persistence. Preserve customer entitlements and live billing.

## Changes
None to Stripe, Supabase database or functions, Resend, customer subscriptions/entitlements, website, homepage or plan. GitHub audit only.

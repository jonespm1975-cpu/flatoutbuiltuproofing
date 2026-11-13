# Task 57 — Sandbox email receipt reconciliation
Date: 2026-11-13 UTC
Status: READ-ONLY DATABASE RECONCILIATION COMPLETE; PROVIDER DELIVERY UNVERIFIED

## Verified Supabase observation
Joined public.sandbox_email_retry_queue to public.purchase_confirmations by stripe_checkout_session_id. The sole returned sandbox row had:
- queue.status = accepted
- queue.attempts = 0
- queue.provider_message_id IS NULL
- queue.lease_token IS NULL
- purchase confirmation_email_status = sent
- purchase confirmation_email_sent_at IS NOT NULL
- purchase terms_version = sandbox-test

The queue and purchase statuses agree. Missing provider message ID means Resend acceptance/delivery cannot be independently verified from this record. Zero attempts is consistent with the currently deployed stripe-test-webhook v25 direct-send path, but is not proof of which process sent the email.

## Deployed-source finding
Supabase stripe-test-webhook v25 checks purchase_confirmations.confirmation_email_status and directly POSTs to Resend using a stable Idempotency-Key. It does not acquire the sandbox_email_retry_queue lease before sending. Concurrent webhook requests may therefore both attempt provider delivery. The sandbox retry worker v10 remains dry-run according to deployed metadata and prior source review.

## Safety decision
Do not reset the accepted queue row or resend an email: either could duplicate a confirmation. No email, Stripe payment/Checkout session, SQL mutation, Edge Function deployment, or billing/homepage/plan change was made in Task 57.

## Required next checks
1. Reconcile Resend message status using authorized provider records, without resending.
2. Prepare a service-role-only single-session claim RPC and integrate it into the sandbox webhook, retaining the existing idempotency key.
3. Run isolated actual-source concurrent webhook, invalid-token, expired-lease, retry and provider-accepted-before-finish tests before any deployment.
4. Keep the sandbox worker disabled until all required tests pass; do not change production billing or subscriptions.

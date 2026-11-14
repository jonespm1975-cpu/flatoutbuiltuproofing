# Flat Out Built-Up Roofing — Sandbox webhook reconciliation

**Date:** 14 November 2026  
**Scope:** Read-only Stripe Sandbox and Supabase checks. No event replay, email send, payment, live setting change, or subscription mutation.

## Evidence

- Stripe Sandbox Workbench screenshots show the membership webhook delivery detail with HTTP **200** and response text **“Sandbox membership synchronized.”** The screenshots contain more than one event ID; treat the successful delivery and the other displayed event as separate records.
- Supabase read-only query found subscription `sub_1Ub6xSKS41qhUQTKc7GWuQqT`: `status=active`, `livemode=false`, `cancel_at_period_end=true`, current period end **12 December 2026 22:59:03 UTC**. The cancellation setting was preserved.
- The row's `last_stripe_event_created` is 1794526609 and `updated_at` is 12 November 2026 23:36:52 UTC, later than the 22:59 event origin displayed in the Stripe screenshot. The current database state is consistent with the sandbox membership, but these timestamps do not prove that the 22:59 delivery caused the current row state.
- Supabase function edge logs for 13–14 November show a **POST 200** to `membership-test-webhook` at 14 November 00:04:30.912 UTC. The log does not include the Stripe event ID, so it is not attributed to a specific event.
- The sandbox course purchase confirmation record remains marked `sent`; its queue row remains `accepted`, with zero attempts and no provider message ID. This database state does not independently prove recipient inbox delivery. The connected Gmail search did not find a matching purchase confirmation; Resend's provider event status is still required.

## Additional read-only live webhook review

- Current `stripe-webhook` v31 validates a paid live checkout, verifies its Stripe price and customer, grants course access, and writes the purchase-confirmation row.
- It then sends the confirmation email inline. If Resend is unavailable or rejects the request, the handler returns HTTP **503 after course access and the confirmation record have already been written**. Thus Stripe may retry the same event even though access was granted; the inline email call remains coupled to webhook response and can delay acknowledgement.
- The test course webhook v25 returns HTTP **200** when its email configuration is missing or its send/status update fails, preserving test access while treating email as pending. It still attempts Resend inline when configured.
- No webhook code, deployed function, database row, secret, email, or Stripe setting was changed. A tested isolated outbox flow is still needed before altering production webhook behavior.

## Limits and next checks

- Do not resend the email or replay any Stripe event until the provider/event state is reconciled.
- Resend account access is required to verify provider acceptance and recipient delivery.
- A genuine two-independent-connection database concurrency test remains outstanding; the current connected SQL tool does not provide a safe isolated two-session test harness.
- Live billing and production Stripe settings were not touched.


## Isolated sandbox email/webhook separation — 14 November 2026

- Deployed `stripe-test-webhook` **v26** in Supabase project `fhyhshakmvqwzdyannec`; the handler still rejects live-mode events.
- Removed the inline Resend request from this **sandbox-only** course webhook. After successful course access and receipt recording, a pending confirmation is ensured in `public.sandbox_email_retry_queue` using an idempotent upsert. Provider-send failure can no longer make this webhook return 503 after access was granted; queue-write failure still returns 503 so Stripe can retry the database operation.
- Verified existing database trigger enqueues new `cs_test_` receipts only when `terms_version='sandbox-test'` and confirmation status is pending. Verified service-role-only claim/finish function grants and that the deployed `purchase-email-retry-worker` is a read-only dry-run with sending, claiming and scheduling disabled.
- Deployed-source readback confirms v26 remains test-only, includes the idempotent queue upsert, and has no Resend URL or `RESEND_API_KEY` reference.
- Post-deployment database readback showed the existing single queue row unchanged: accepted, zero attempts, no provider ID; zero pending sandbox receipts. No test checkout, event replay, email, payment, or live setting change was performed.
- **Verification limit:** deployment/source and database invariants are verified, but no signed end-to-end course event was replayed or generated. Runtime HTTP handling and new-receipt trigger behavior were not exercised in this turn. Do not infer full end-to-end test readiness.
- Existing live `stripe-webhook` v31 is unchanged and still sends email inline; this isolated change does not clear the live webhook launch blocker.

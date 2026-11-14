# Flat Out Built-Up Roofing — Sandbox webhook reconciliation

**Date:** 14 November 2026  
**Scope:** Read-only Stripe Sandbox and Supabase checks. No event replay, email send, payment, live setting change, or subscription mutation.

## Evidence

- Stripe Sandbox Workbench screenshots show the membership webhook delivery detail with HTTP **200** and response text **“Sandbox membership synchronized.”** The screenshots contain more than one event ID; treat the successful delivery and the other displayed event as separate records.
- Supabase read-only query found subscription `sub_1Ub6xSKS41qhUQTKc7GWuQqT`: `status=active`, `livemode=false`, `cancel_at_period_end=true`, current period end **12 December 2026 22:59:03 UTC**. The cancellation setting was preserved.
- The row's `last_stripe_event_created` is 1794526609 and `updated_at` is 12 November 2026 23:36:52 UTC, later than the 22:59 event origin displayed in the Stripe screenshot. The current database state is consistent with the sandbox membership, but these timestamps do not prove that the 22:59 delivery caused the current row state.
- Supabase function edge logs for 13–14 November show a **POST 200** to `membership-test-webhook` at 14 November 00:04:30.912 UTC. The log does not include the Stripe event ID, so it is not attributed to a specific event.
- The sandbox course purchase confirmation record remains marked `sent`; its queue row remains `accepted`, with zero attempts and no provider message ID. This database state does not independently prove recipient inbox delivery. The connected Gmail search did not find a matching purchase confirmation; Resend's provider event status is still required.

## Limits and next checks

- Do not resend the email or replay any Stripe event until the provider/event state is reconciled.
- Resend account access is required to verify provider acceptance and recipient delivery.
- A genuine two-independent-connection database concurrency test remains outstanding; the current connected SQL tool does not provide a safe isolated two-session test harness.
- Live billing and production Stripe settings were not touched.

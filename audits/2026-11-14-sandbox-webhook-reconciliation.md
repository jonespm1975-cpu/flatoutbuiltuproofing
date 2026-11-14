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


## Log reconciliation and corrective sandbox changes — 14 November 2026

- **Correction to the earlier attribution:** Stripe's API currently shows `evt_1Ub6xTKS41qhUQTKCAsjwHU2` is still pending with `pending_webhooks=1`. It is a subscription-mode Checkout event. The “Sandbox membership synchronized” HTTP 200 shown earlier and the later 00:04:30 function log cannot be attributed to this event; the 00:04:30 log has no event ID and the screenshot showed a different subscription lifecycle event. The current membership row still has `cancel_at_period_end=true`.
- Supabase logs from 12 November show membership checkout v4 returned 503 twice, then v5 returned 200 after the Managed Payments/tax-code correction. Membership webhook v5 returned 400 on the initial deliveries, followed by HTTP 200s on v7/v8/v9. The 14 November 00:04:30 membership-webhook request also returned 200, with no event ID in that log.
- Stripe's sandbox API reports exactly two unresolved `checkout.session.completed` events in the checked period:
  - `evt_1Ub6xTKS41qhUQTKCAsjwHU2`: subscription mode, £1.99 monthly test checkout; it must be ignored by the course webhook and processed only by the membership webhook.
  - `evt_1UaR5FKS41qhUQTK9ekgoE4b`: course payment mode; £9.99 line item plus £2.00 sandbox tax, already has a matching `beginner-training-course` access row. Its legacy price and the current sandbox price both map to the same Stripe product and are one-time GBP 999-pence prices.
- Deployed `stripe-test-webhook` **v27** to correct a runtime defect where the receipt status was referenced without being loaded. It now idempotently persists/reads the sandbox receipt before ensuring its queue row; it contains no Resend sender.
- Deployed `stripe-test-webhook` **v28** to accept only the two verified sandbox price IDs (current and legacy for the same product), preserving the existing one-time GBP 999-pence and one-line-item checks. Readback confirms the subscription-mode guard, declared receipt readback, and absence of Resend URL/secret references.
- Reconciled the already-paid legacy sandbox course session by inserting its missing purchase-confirmation row using Stripe’s verified 1199-pence GBP total, existing course-access mapping, and recorded consent timestamp. Its database trigger created a pending sandbox queue row with zero attempts and no provider message ID. No email was sent.
- **Outstanding delivery action:** Stripe still reports both events above with `pending_webhooks=1`. No replay was performed because the Stripe Workbench opened to a sign-in page in this browser session, and the connected Stripe API offers read operations but no event-redelivery operation. After interactive Stripe sign-in, retry each event only to its correct test endpoint (subscription event to `membership-test-webhook`; course event to `stripe-test-webhook`) and inspect the resulting endpoint response. Do not retry either event to a live endpoint.
- No test checkout/payment was created, no live setting or billing changed, and no email was sent. Source deployment and database readback are verified; post-deployment signed-event runtime verification is still outstanding.


## Next priority — purchase email and live-worker reconciliation — 14 November 2026

- Checked Supabase function-edge logs for the purchase email worker, live delivery worker, live retry audit, and live Stripe webhook across 12–14 November. The only matching worker calls were the earlier sandbox worker v3 GET **405** and POST **401** at 12 November 16:26 UTC. No calls to either live email worker or audit function appeared in the checked windows.
- Deployed sandbox `purchase-email-retry-worker` v10 is a static read-only dry run: it reports sending, claiming, and scheduler disabled and returns no tokens. It does not call Resend.
- Gmail search for the exact purchase-confirmation subject found no matching message. The older sandbox checkout record still says receipt `sent` and queue `accepted`, but has zero attempts and no provider message ID; neither the database nor Gmail establishes provider acceptance or inbox delivery. The newer reconciled sandbox receipt is `pending` with a pending queue row, zero attempts, and no provider ID.
- Plugin discovery did not find a connected Resend provider/log tool. Resend event status remains unverified; no resend was attempted.
- Live `stripe-webhook` v31 still performs the Resend call inline after recording course access. A send failure can return 503 after access is granted. The internal live email outbox currently has zero rows and is documented as inert staging: no trigger, live webhook integration, or scheduler. The live delivery worker v1 is capable of sending only when both `LIVE_PURCHASE_EMAIL_WORKER_ENABLED` and `LIVE_PURCHASE_EMAIL_SENDING_ENABLED` are true, but has no scheduler; no change was made to it or the live webhook.
- **Launch readiness:** sandbox email delivery is not verified, and the live webhook/outbox migration is not active. Keep customer email activation and any live webhook change on hold until provider delivery can be checked and a reviewed outbox cutover can preserve email delivery while decoupling Stripe acknowledgement.

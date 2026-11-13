# Task 220 — Stripe, two-connection, Resend verification — 2026-11-13

## Stripe sandbox — READ ONLY
Connected to Stripe TEST account acct_1UaPRuKS41qhUQTK. Listed existing checkout.session.completed events.
Historical paid £9.99 course event evt_1UahMZKS41qhUQTK8J1OszL3, created 2026-11-11, has mode=payment, livemode=false, amount_total=999 GBP, expected course_id and three true consent metadata flags; pending_webhooks=0.
Important: pending_webhooks=0 does not establish HTTP 2xx delivery, valid signature verification, or successful entitlement/receipt. No event resend performed.

## Concurrent database calls — INCONCLUSIVE
Issued two Supabase execute_sql calls via Promise.allSettled, each executing pg_try_advisory_xact_lock(21920261113) and pg_sleep(3).
Returned distinct pg_backend_pid values 283858 and 283860, both acquired=true. This confirms separate backend sessions were used but NOT overlapping lock contention, likely tool/backend serialized or query timing. Therefore real race-condition single-winner claim test remains UNVERIFIED. No durable rows modified.

## Resend provider reconciliation — BLOCKED
Resend provider account/events are not exposed by the available connected tools in this workflow. No provider-status read was performed. Prior historical Delivered status is user-reported, not independently rechecked in this task. The live outbox was empty on read-only check.
The installed worker records Resend API acceptance as sent, which is not final inbox delivery. No emails sent.

## Next executable steps
- Establish independently controlled simultaneous Postgres connections (e.g. external test harness with two dedicated sessions) against a disposable test database or controlled rollback scenario; demonstrate one claim winner and one loser with recorded timestamps.
- Inspect historical Stripe event delivery attempts/status for the sandbox endpoint; validate a correctly signed event and an invalid signature in isolated handler tests, without resending to production.
- Obtain Resend provider event log / API read permission and reconcile provider message IDs and delivery status with Supabase records.
- Keep production functions and live billing unchanged.

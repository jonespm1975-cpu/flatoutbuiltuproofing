# Task 172 — single-sender webhook change review (NOT DEPLOYED)
Date: 2026-11-13

## Change objective
Remove direct Resend sending from live stripe-webhook, leaving a durable receipt/outbox record for a separately gated worker. Existing webhook currently sends email directly and returns 503 if provider or confirmation-status update fails. Current live worker is a second potential sender when enabled.

## Proposed webhook flow (review-only pseudocode)
```
verify Stripe signature and allowed event type
verify livemode, paid session, customer mapping, metadata consent,
  one allowed £9.99 line item, and authenticated customer
BEGIN ATOMIC FULFILMENT (server-side database RPC)
  upsert course_access idempotently, preserving existing grant
  upsert purchase_confirmations idempotently with pending status only on INSERT
  enqueue unique live_purchase_email_outbox job only if receipt is pending
COMMIT
return HTTP 200 on durable grant and queue success
// NO Resend call in payment webhook
```

## Mandatory implementation decisions
- The current entitlement and receipt writes are separate Supabase REST calls. Implement a transactional server RPC with narrowly scoped service-role execute grants before claiming atomicity.
- Existing trigger enqueue_live_purchase_confirmation_email_on_receipt is already enabled and can insert the unique outbox job. Avoid a second manual enqueue path or ensure ON CONFLICT DO NOTHING.
- Existing purchase_confirmations row must never be overwritten from sent back to pending.
- Worker must skip sent receipts, accepted jobs, and uncertain provider outcomes; reconcile with Resend before retry after unknown result. Existing outbox CHECK currently permits only pending/leased/accepted/failed, so adding an uncertain state needs a reviewed migration, not an untested update.
- Preserve webhook signature verification, exact £9.99 live price allowlist, paid status, consent, and course access.
- Keep worker's two live email flags disabled through cutover. Do not allow webhook and worker to send concurrently.
- Preserve membership subscription handling separately; do not modify its billing or cancellation.

## Required tests before deployment
- Two independent PostgreSQL connections simultaneously process duplicate Stripe events and claim the same outbox record.
- One entitlement, one receipt, one outbox row, one sender; invalid customer/consent/price fails closed.
- Provider accepted but DB finalisation fails: no automatic duplicate send, even after idempotency window expires.
- Already-sent historical receipts and accepted jobs are not requeued.
- Email provider outage does not revoke access or require a new payment.
- Rollback with in-flight claims and queued jobs preserves state.

## Status
Review specification only. No source code changed, no branch created, no SQL migration executed, no production deployment, no email/payment sent. Test environment still unavailable; Supabase project has zero development branches.

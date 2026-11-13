# Task 82 — Historical sandbox email status root-cause analysis (2026-11-13 UTC)

## Deployed code inspected
- Supabase stripe-test-webhook v25: after receipt upsert, SELECTs purchase_confirmations.confirmation_email_status; if not sent, sends directly via Resend POST with Idempotency-Key sandbox-course-confirmation-{session.id}; on provider HTTP success, UPDATEs purchase_confirmations status to sent and sent_at. It does NOT claim or finish sandbox_email_retry_queue.
- Supabase purchase-email-retry-worker v10: dry-run mode, sending_enabled:false, claiming_enabled:false, scheduler_enabled:false; read-only reporting only.

## Existing data
- Confirmation status sent, timestamp 2026-11-12 22:28:36.658 UTC.
- Queue accepted, attempts 0, provider_message_id NULL, updated_at 2026-11-12 16:12:25.947732 UTC.
- v25 direct send can mark confirmation sent without changing queue; explains why a later sent timestamp can coexist with an earlier queue update. Does not prove actual Resend delivery or explain exactly who first set queue accepted.

## Safe remediation
- Do not rewrite historical queue attempts or fabricate a provider ID.
- Do not automatically resend this session; provider delivery status ambiguous.
- Obtain provider message ID and status from Resend history before manual reconciliation.
- Task 67 candidate introduces atomic claim/finish for future eligible pending queue records and explicit send flag; no automatic send when flag disabled.
- Keep candidate undeployed until historical reconciliation and remaining end-to-end review.
- Preserve PR #5 draft, subscriptions, entitlements, live billing, homepage, Supabase Free plan.

No data changes or emails sent.

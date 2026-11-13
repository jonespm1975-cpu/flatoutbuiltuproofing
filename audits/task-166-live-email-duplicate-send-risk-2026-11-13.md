# Task 166 — live confirmation email duplicate-send failure mode

Date: 2026-11-13. Read-only inspection of currently deployed Supabase Edge Functions; no production edits, sends, payments or webhook replays.

## Confirmed code behaviour
- Live stripe-webhook v31 verifies Stripe signature, validates course checkout, grants course access and upserts purchase confirmation, then directly POSTs to Resend if confirmation_email_status != 'sent'. On Resend HTTP success it updates the confirmation to 'sent'. On DB update failure it returns HTTP 503, prompting potential Stripe retry.
- Live-purchase-email-delivery-worker v1 separately claims pending outbox jobs when BOTH LIVE_PURCHASE_EMAIL_WORKER_ENABLED and LIVE_PURCHASE_EMAIL_SENDING_ENABLED are exactly true. It uses Resend Idempotency-Key 'course-confirmation-'+session, same key as webhook. The actual flag values have not been independently verified.
- The webhook does not first acquire a per-purchase email lease or atomically reserve an exclusive sender role. Two simultaneous deliveries could both observe 'pending'. If Resend accepts but DB update fails, subsequent retries could attempt another send. Resend idempotency semantics/retention not independently verified.
- The webhook requires RESEND_API_KEY and PURCHASE_CONFIRMATION_FROM even after access has been granted, so missing email config can return 503 while access already exists. This is recoverable via idempotent grant but couples email delivery to payment webhook success.
- The webhook constructs email content containing customer email, full Stripe session reference and published business details; avoid logging or copying these into audit evidence.
- Live outbox and live cs_live_ grants were both zero at latest read-only query; no current evidence of affected live customers.

## Proposed safe fix (NOT implemented)
1. Design one authoritative email sender: Stripe webhook grants entitlement and creates durable pending outbox record atomically/idempotently; only a separately gated worker sends.
2. Use a unique session constraint and atomic lease/token claim; persist provider acceptance and provider message ID in the same transaction as status finalisation. Handle expired leases with provider reconciliation and avoid automatic resend after uncertain acceptance.
3. Separate course grant success from email provider availability so the webhook can acknowledge a successfully recorded purchase while the outbox handles retries.
4. Preserve existing course grants, existing subscription cancellations, homepage, live checkout/billing configuration, and Supabase Free plan.
5. Before any live deployment: confirm exact Resend idempotency rules, add isolated two-connection race tests and fault injection for provider accepted / DB failed, test migrations on disposable fixtures, review legal email text and audit auth/RLS, obtain explicit production change approval.

## Status
Confirmed design risk, not evidence of a duplicate email actually sent. No code deployed. Production flags not read. Resend historical sandbox delivery reported Delivered by owner.

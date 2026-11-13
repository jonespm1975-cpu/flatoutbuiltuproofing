# Payment/email separation review — 2026-11-13

## Scope and safety
Read-only inspection of the currently deployed Supabase Edge Function source, the relevant database function and triggers, and the existing proposed webhook candidate. No code was deployed or changed in Supabase. No SQL writes, Stripe event replays, payments, Checkout sessions, or emails were created.

## Verified current behaviour
- `stripe-webhook` is ACTIVE at version 31. After validating the paid live Checkout session, it grants course access and records the purchase confirmation, then calls Resend directly. It returns HTTP 503 when email configuration, provider acceptance, or the email-status update fails. This couples webhook acknowledgement to email delivery after course access may already exist.
- `live-purchase-email-delivery-worker` is ACTIVE at version 1. It requires both `LIVE_PURCHASE_EMAIL_WORKER_ENABLED=true` and `LIVE_PURCHASE_EMAIL_SENDING_ENABLED=true`, then claims outbox rows and sends through Resend. Flag values were not read.
- `stripe-test-webhook` is ACTIVE at version 25. Its course flow also calls Resend directly, although provider and receipt-status failures after entitlement return HTTP 200. The source has no atomic claim before its send.
- `public.fulfil_live_course_purchase_v4` exists with the seven arguments used by the proposed v32 file. It validates the purchase evidence and idempotently writes entitlement and receipt records. Only `service_role` has execute permission; `anon` and `authenticated` do not.
- An AFTER INSERT/UPDATE trigger on `purchase_confirmations` enqueues a live email outbox row for a `cs_live_` receipt with status `pending`. This supports separating durable fulfilment from provider delivery.

## Safe candidate
The repository already contains `audits/task-190-proposed-stripe-webhook-v32-NOT-DEPLOYED.ts`. Its core approach calls `fulfil_live_course_purchase_v4` and returns success after the database confirms fulfilment, leaving email to the receipt-triggered outbox. This is consistent with the function and trigger inspected above. The candidate remains untested and undeployed.

## Remaining gate
Do not deploy the candidate until isolated tests prove signed webhook handling, duplicate events, provider failure/retry, provider acceptance followed by database failure, and two independent simultaneous claims. Those runtime tests were not available or run during this review. Production flags and live outbox contents were not inspected. Preserve live billing and existing entitlements.

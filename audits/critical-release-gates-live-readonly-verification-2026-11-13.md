# Critical tasks verification — 13 November 2026

## Checks actually executed
- Read installed definitions of public.claim_live_purchase_email_retry and public.finish_live_purchase_email_retry from pg_proc.
- Both functions are SECURITY DEFINER and use an empty search_path. Claim uses FOR UPDATE SKIP LOCKED, a five-minute lease, and max five attempts. Finish checks lease token and unexpired lease; updates outbox and purchase receipt in one SQL transaction.
- Rechecked live data counts: internal.live_purchase_email_outbox = 0; public.purchase_confirmations with cs_live_ = 0; public.course_access with cs_live_ = 0.
- Rechecked Supabase security advisor: WARN auth_leaked_password_protection disabled. Five INFO RLS enabled/no-policy tables; these were previously audited as intentionally inaccessible to anon/authenticated.

## Risk and non-completion
- Stripe webhook v31 still directly sends through Resend; live email worker v1 independently sends if two flags are enabled. Do not enable both senders.
- A provider acceptance followed by an expired lease or a failed finish RPC may cause re-attempt. Same Resend Idempotency-Key is used by both code paths, but must be tested against actual provider behavior and retention window; do not assume guaranteed exactly-once delivery.
- No isolated DB available. No two-connection concurrency test run. No live code, database, Auth settings, billing, customer entitlements, emails or homepage changed.
- No historical Stripe 422 event payloads or Resend delivery evidence obtained here. No end-to-end payment/account/membership tests executed.
- Legal pages remain DRAFT and purchase-info checkout UI disabled.
- Task 187 v4 SQL and Task 190 cutover plan remain review-only GitHub artifacts, not deployed.

## Critical release sequence
1. Acquire verified free disposable PostgreSQL environment; run two-connection tests against v4 and actual schema/trigger.
2. Fix checkout terms_version metadata, webhook single-RPC fulfilment and remove direct Resend send; confirm matching course ID and webhook source.
3. Prove worker lease/idempotency and safe handling of ambiguous provider acceptance; keep worker disabled until verification.
4. Review and finalise UK legal pages and implement functional consent controls; do not remove draft warnings without approved operating details.
5. Enable leaked-password protection when configuration is accessible and validated; re-run security advisor.
6. Reconcile Stripe historical 422 and Resend provider logs, test account and membership lifecycle with synthetic sandbox identities.
7. Deploy only after verified test evidence, rollback plan and explicit approval for production billing/email activation.

Status: checks performed; remaining critical implementation tasks NOT completed.

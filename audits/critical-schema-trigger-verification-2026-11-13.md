# Critical payment release: additional schema/trigger verification
Date: 2026-11-13
Read-only Supabase inspection. No customer operations.

Verified purchase_confirmations has NOT NULL terms_version with default '2026-11-11', but relying on the default is insufficient evidence of actual consent to that specific text.
Verified triggers:
- enqueue_live_purchase_confirmation_email_on_receipt: AFTER INSERT OR UPDATE OF confirmation_email_status, calls internal.enqueue_live_purchase_confirmation_email().
- trg_enqueue_sandbox_purchase_confirmation: AFTER INSERT, calls internal.enqueue_sandbox_purchase_confirmation().
Read installed trigger functions:
- live enqueues cs_live_% records with pending confirmation_email_status, ON CONFLICT DO NOTHING in internal.live_purchase_email_outbox.
- sandbox enqueues only terms_version='sandbox-test' AND cs_test_% AND pending, ON CONFLICT DO NOTHING in public.sandbox_email_retry_queue.
Both are SECURITY DEFINER with empty search_path.
Two triggers do not imply two external email sends; the duplicate-sender risk comes from live webhook v31 direct Resend POST plus separately deployable worker.
Prior staged webhook v32 source removed direct Resend and calls RPC v4. Prior staged checkout v13 deliberately includes draft-review-required terms_version and cannot be deployed until legal text approved and consistent version selected.

Release blockers:
1. No disposable PostgreSQL environment, so two-connection concurrency/rollback tests not performed.
2. RPC v4 not installed and webhook v32 not deployed.
3. Actual checkout consent UI remains disabled; legal pages DRAFT and privacy placeholders unresolved.
4. Worker retry/idempotency provider behavior unverified; do not enable worker.
5. Supabase leaked-password protection warning remains outstanding.
6. Historical Stripe 422 and Resend provider delivery not independently reconciled.
7. No final owner go-live approval for coordinated production activation.

All production resources unchanged by this verification. Do not claim critical tasks complete.

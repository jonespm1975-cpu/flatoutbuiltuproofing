# Task 160 — Resend evidence and persistence gap (2026-11-13)

Read-only inspection of live Supabase table schemas confirms public.purchase_confirmations has confirmation_email_status, confirmation_email_sent_at and confirmation_email_error but no provider_message_id. public.sandbox_email_retry_queue has provider_message_id, status, attempts, lease token and timestamps.

Historical existing sandbox receipt was marked sent; queue accepted; provider_message_id NULL. A query of function_logs for email/Resend/confirmation between 2026-11-12 22:20 and 22:35 UTC returned zero matching rows. Therefore neither the queue nor these logs proves Resend provider acceptance/delivery or mailbox receipt. Do not resend the existing confirmation.

Recommended future improvement (not deployed): after successful Resend HTTP response, parse and validate JSON id, persist provider message ID transactionally with queue completion, and distinguish accepted/sent/delivered/bounced events instead of equating HTTP acceptance to inbox delivery. Preserve idempotency and avoid duplicate sends on ambiguous network failures. Test on isolated records before deployment. No changes made to production.

Next blocker: direct authenticated Resend message lookup using the existing historical send timestamp, or a genuine provider ID from external logs. No Resend provider connector is currently available.

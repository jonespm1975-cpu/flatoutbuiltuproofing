# Supabase email provider evidence and permissions recheck — 2026-11-13

Read-only live database queries:
- public.sandbox_email_retry_queue: status accepted = 1 row, non-null provider_message_id = 0 rows.
- internal.claim_sandbox_email_retry_v2: anon EXECUTE false; authenticated EXECUTE false; service_role EXECUTE true.
- internal.finish_sandbox_email_retry_v3: anon EXECUTE false; authenticated EXECUTE false; service_role EXECUTE true.

**Conclusion:** access privileges match intended service-only design. No Resend delivery verified: accepted status is not evidence of provider delivery. No two-session concurrent transaction executed. No SQL mutation, email send, payment, checkout, deployment, or subscription change.

Next evidence needed: authenticated Resend event lookup using original message identifier or relevant timestamp, and genuine disposable two-session PostgreSQL concurrency testing with isolated queue rows, rollback and deterministic assertions.

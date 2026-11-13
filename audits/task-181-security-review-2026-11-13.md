# Task 181 — restricted fulfilment v3 security and edge-case review
Date: 2026-11-13

## Security advisor findings (read-only)
- WARN: Supabase Auth leaked-password protection disabled. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- INFO: RLS enabled but no policy on internal.live_purchase_email_outbox, internal.membership_test_checkout_leases, public.course_checkout_reservations, public.purchase_confirmations, public.sandbox_email_retry_queue. Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- These INFO findings are not proof of unsafe exposure; service-role/owner access is intended. Audit table grants separately.

## Task 180 v3 draft review
1. SECURITY DEFINER public wrapper is highly privileged and trusts arguments. Function-level grants must be verified for anon/authenticated/PUBLIC and actual owner; never expose service-role token to browser.
2. SECURITY INVOKER private core is invoked under the wrapper owner. Review schema-qualified references, function owner, trigger execution rights, and default grants. Test under actual PostgREST service_role.
3. A paid Stripe event must be validated by webhook before invoking RPC. Database function does not independently verify payment; a stolen service-role credential would allow fraudulent grants.
4. Same-session duplicate serialisation uses advisory lock; distinct sessions for same user/course rely on unique index. Must test both with two connections.
5. The v3 draft compares immutable receipt fields but does not verify original grant owner when a previously used session has been attached to an existing grant of the same user/course. Existing unique constraints limit reuse, but test edge cases.
6. Additional genuine purchases of already-owned courses produce additional receipts and emails. Checkout duplicate prevention/refund policy remains separate.
7. Current webhook still sends directly; switching to queue-only must be coordinated with worker flags and provider uncertainty handling to avoid missed/duplicate emails.
8. Critical: Task 180 v3 SQL has not been executed. Do not claim functional tests or concurrency tests passed.

## Next actions
- Audit actual table privileges and SECURITY DEFINER owner; fix any verified unsafe exposure in a reviewed change.
- Enable leaked-password protection through approved Supabase Auth configuration if available, after checking impact and user approval.
- Run isolated two-connection tests and rollback verification before production deployment.

No production writes or live billing/email changes made.

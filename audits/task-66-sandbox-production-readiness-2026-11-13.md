# Task 66 — Sandbox production-readiness security audit
Date: 2026-11-13 UTC
Status: BLOCKED — NO DEPLOYMENT

## Verified directly
- GitHub repository inspected: jonespm1975-cpu/flatoutbuiltuproofing. Searches for task-65 and claim evidence did not locate Task 65 two-connection results. Two candidate Task 65 audit filenames returned 404. This does not establish that no other evidence exists.
- Supabase project fhyhshakmvqwzdyannec: stripe-test-webhook ACTIVE version 25 (SHA-256 c6f9e9d38775ea8a3101ef82523d277f2f8aedc902d46a6a0e6404fe03c4f550).
- Actual deployed webhook source performs SELECT confirmation_email_status, calls Resend when not sent, then UPDATE sent. It does not call claim_test_course_confirmation_email or finish_test_course_confirmation_email. This read/send/write sequence has a duplicate-send race under concurrent webhook requests. Resend Idempotency-Key is present, but not a substitute for a verified database claim and provider replay test.
- Actual database function public.claim_test_course_confirmation_email uses FOR UPDATE OF q SKIP LOCKED, a five-minute lease, UUID lease_token and attempts<5. SQL privileges verified: service_role EXECUTE true, anon false, authenticated false. Same privilege pattern for finish_test_course_confirmation_email and internal.finish_sandbox_email_retry_v3.
- Table privileges: anon/authenticated lack direct privileges on purchase_confirmations and sandbox_email_retry_queue; authenticated has SELECT on course_access, with no write privilege in observed grants.
- Supabase security advisor reports INFO RLS enabled with no policy on five tables (potentially intentional for service-only tables), plus WARN leaked-password protection disabled. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- Prior Task 40 audit explicitly stated concurrent populated-row tests, lease-expiry/successful finish, provider failure recovery and webhook integration remained untested.

## Required tests NOT executed / NOT proven
1. Two genuinely independent Postgres connections contending for a synthetic sandbox queue claim.
2. Same-event simultaneous webhook delivery through actual handler with mocked Resend; exactly one provider attempt.
3. Failed provider send and retry, expired lease, stale token rejection and ambiguous provider timeout.
4. Duplicate entitlement prevention and unchanged existing entitlements/subscription cancellation, checked before and after isolated test.
5. Full regression suite on candidate webhook source.

## Gate decision
FAIL / HOLD. Do not deploy existing or revised webhook, enable email sending, or modify production data until actual-source and two-connection isolated tests pass with reproducible logs. No live emails, payments, checkout sessions, billing changes, homepage changes, Supabase plan changes, or database writes performed in this audit.

## Safe proposed remediation (not deployed)
Integrate sandbox webhook with claim/finish RPCs and fail-closed send flag; only lease owner may send and finish. Preserve provider idempotency key. Test using isolated synthetic rows, two independent database sessions and mocked provider. Review handling of provider-accepted/DB-finish-failed ambiguous delivery. Re-audit RLS and functions, then deploy only after complete pass.

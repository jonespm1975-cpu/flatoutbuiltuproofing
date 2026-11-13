# Task 100 — final sandbox webhook readiness and RPC permission review
Date: 2026-11-13 UTC

## Confirmed installed RPC signatures
public.claim_test_course_confirmation_email(p_session text) RETURNS TABLE(claim_token uuid, attempt_number integer).
public.finish_test_course_confirmation_email(p_session text,p_token uuid,p_accepted boolean,p_provider_id text,p_error text) RETURNS boolean.
Both owned by postgres, SECURITY DEFINER, search_path="".
Both RPC argument names and types match Task 67 candidate's admin.rpc calls.

## Verified execute privileges (read-only pg_catalog inspection)
- anon: EXECUTE false for both
- authenticated: EXECUTE false for both
- service_role: EXECUTE true for both

## Evidence and limitations
- Isolated PostgreSQL 17 GitHub Actions job 131621341732 passed six concurrency/lease/retry groups. This is not two concurrent sessions against installed Supabase.
- Task 70 actual-source mocked webhook checks passed; mock provider success does not establish real Resend delivery.
- Deployed stripe-test-webhook remains v25; candidate Task 67 is not deployed.
- Historical sandbox receipt marked sent while queue accepted attempts=0, provider_message_id=NULL. Provider delivery not independently verified.

## Decision
HOLD release. Do not merge draft PR #5 or deploy candidate. Require Resend provider reconciliation, exact production feature-flag verification without exposing values, controlled end-to-end sandbox webhook check, and documented rollback plan. Preserve live billing, subscription cancellation, entitlements, homepage, Free plan. No emails or payments initiated; no database writes.

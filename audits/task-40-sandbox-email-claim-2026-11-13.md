# Task 40 — Sandbox email claim deployment
Date: 2026-11-13 UTC
Status: DATABASE CLAIM/FInISH RPCs DEPLOYED AND BASIC NEGATIVE TESTS PASSED; WEBHOOK INTEGRATION NOT DEPLOYED.

Applied migration task40_sandbox_course_email_claim:
- public.claim_test_course_confirmation_email(text): SECURITY DEFINER, service-role-only, single session, sandbox-test receipt, pending email, due queue, attempts<5, FOR UPDATE SKIP LOCKED, five-minute lease with random UUID token.
- public.finish_test_course_confirmation_email(text,uuid,boolean,text,text): SECURITY DEFINER service-role-only wrapper to internal.finish_sandbox_email_retry_v3; existing atomic queue and receipt update.
Migration source: supabase/migrations/task-40-sandbox-email-claim-20261113.sql.

Verified with rollback-only SQL: unknown cs_test_ session not claimable; cs_live_ not claimable; invalid token cannot finish nonexistent claim. has_function_privilege(service_role,claim)=true; anon claim=false; anon finish=false. Existing course_access rows=2 and membership cancellation=true.

Not tested: true concurrent claims on a populated synthetic receipt, lease expiry and successful finish, actual webhook integration, provider failure recovery, and actual Resend delivery. The webhook remains deployed v25 with direct email sending and DOES NOT call these new functions. The sandbox retry worker remains v10 dry-run only. No email sent, no payments or Stripe sessions created, no live billing changes, no homepage changes or Supabase upgrade.

Next priority: integrate webhook using claim/finish, with a separate fail-closed sandbox email sending flag; test mock provider acceptance/failure, verify no duplicate send under concurrent webhook events and lease expiry, then deploy only after evidence.

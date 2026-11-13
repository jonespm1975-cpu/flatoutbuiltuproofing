# Task 177 — environment and privileged RPC security readiness
Date: 2026-11-13

## Verified read-only
- Local runtime has no psql, postgres or docker executable on PATH. Existing Task 176 test-plan file is available, but no executable disposable PostgreSQL instance is available.
- Supabase list_branches previously returned zero branches.
- Read-only pg_proc inspection on production found **zero functions** named fulfil_live_course_purchase%; Task 175 draft is not deployed.

## Critical design correction before any deployment
- Task 175 draft creates a SECURITY DEFINER function in public schema. Supabase security guidance recommends keeping privileged functions in a non-exposed schema, with restrictive execution permissions. Move to internal.fulfil_live_course_purchase_v2, ensure service-role-only execution, and verify that the Edge Function can call the internal schema RPC under the configured Data API exposed schemas. If internal schema is not exposed, use a narrow reviewed alternative; do not expose privileged internal schema indiscriminately.
- PostgreSQL defaults grant EXECUTE to PUBLIC; the proposed CREATE/REVOKE in one transaction prevents external visibility after commit, but a migration should also check default privileges and verify anon/authenticated EXECUTE=false after deployment.
- Because service-role bearer credentials are powerful, validate Stripe signature and paid session in webhook; no browser-supplied RPC access.

## Execution state
No isolated DB created, no concurrency tests executed, no migration installed, no email/payment sent. Do not report tests as passed. Next step: revise draft placement/permissions, then test on a disposable instance.

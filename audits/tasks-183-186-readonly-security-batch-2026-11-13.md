# Tasks 183–186 — independent safe audit batch
Date: 2026-11-13
Scope: read-only Supabase SQL and security advisor; no customer actions.

## Task 183 — Privileged RPC access: verified
13 SECURITY DEFINER functions in public/internal checked. All return anon EXECUTE=false and authenticated EXECUTE=false. Public service-side functions have service_role EXECUTE=true; internal privileged helpers return service_role EXECUTE=false and are called under owning function/trigger roles. Function owner shown as postgres. This is a permissions audit, not an exploit test.

## Task 184 — Public views, table grants, and RLS: verified
No public views or materialized views returned. All six public tables have RLS enabled. anon SELECT=false across all six. authenticated SELECT=true only for course_access, lesson_access, membership_subscriptions; authenticated INSERT/UPDATE/DELETE=false across all six. Three SELECT policies restrict rows by auth.uid()=user_id.

## Task 185 — Publicly callable RPC: verified
Only public.has_active_membership() grants authenticated EXECUTE (anon=false); it is SECURITY INVOKER, STABLE, and selects only the caller's membership with livemode=true, status=active, current_period_end>now(). No parameter allows requesting another user's status. This is static SQL review, not a live user session test.

## Task 186 — Live outbox/receipt baseline and security advisor: verified
Live outbox rows=0, cs_live_ purchase confirmations=0, cs_live_ course grants=0 at query time. Security advisor reports WARN leaked-password protection disabled; INFO five service-only tables have RLS but no policies. These no-policy findings do not themselves indicate unsafe grants. References:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Outstanding blockers
- Task 180 restricted fulfilment SQL not deployed; isolated two-connection concurrency tests not performed.
- Live webhook currently has a direct Resend sender in addition to optional worker; single-sender migration not implemented.
- No disposable PostgreSQL environment/branch currently available; Supabase branch creation may incur cost.
- Leaked-password protection must be enabled via approved configuration and verified; not modified.
- Resend provider-side acceptance, live Stripe historical webhook event correlation, and live environment flags not independently checked in this batch.
- No production DDL/DML, email, Stripe checkout/payment, live billing, entitlement or homepage changes.

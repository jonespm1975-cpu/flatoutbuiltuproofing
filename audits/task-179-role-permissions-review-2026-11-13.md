# Task 179 — database role permissions and restricted function readiness
Date: 2026-11-13

## Verified (read-only Supabase)
- public.claim_live_purchase_email_retry and public.finish_live_purchase_email_retry: anon EXECUTE=false, authenticated EXECUTE=false, service_role EXECUTE=true.
- public schema USAGE: service_role=true, anon=true, authenticated=true.
- internal schema USAGE: service_role=false, anon=false, authenticated=false.

## Design consequence
The Task 178 SECURITY INVOKER public facade cannot directly invoke an internal function as service_role without internal schema USAGE. Granting service_role USAGE on internal is possible in a reviewed migration but increases access to the entire schema's names and must be audited. An alternative is a narrowly scoped SECURITY DEFINER public facade with explicit service_role-only EXECUTE and fixed search_path; it should be reviewed for privilege escalation and ownership before adoption. Prefer private internal core with least-privilege service account and documented grants.

## Required implementation checks
- Confirm owner/EXECUTE grants and any default privileges before installing a new function.
- Verify only service_role can execute public wrapper and internal core; anon/authenticated cannot.
- Verify wrapper and core execute correctly under actual PostgREST role and schema visibility.
- Test Stripe-verified-only call path, immutable receipt conflicts, duplicate sessions, concurrency and outbox trigger in a disposable environment.
- Keep existing webhook direct email sending unchanged until single-sender cutover is proven safe.

## Status
No SQL migration, schema grants, database writes, live payments or emails. Role audit completed; implementation remains blocked on isolated testing and final privilege design.

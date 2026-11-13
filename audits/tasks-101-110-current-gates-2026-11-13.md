# Critical tasks 101–110: current verification and release gate
Date: 2026-11-13 UTC
Scope: read-only Supabase, Stripe and GitHub inspections; one denied anonymous-role function invocation. No production mutations.

## New checks
- Supabase project healthy per previous project inspection; current edge function inventory shows stripe-test-webhook v25 ACTIVE, paid-lesson-content v16 ACTIVE with verify_jwt=true, membership-test-webhook v9 ACTIVE. Staged candidate not deployed.
- PostgreSQL function privileges checked from pg_proc: apply_membership_test_event(jsonb), claim_test_course_confirmation_email(text), finish_test_course_confirmation_email(text,uuid,boolean,text,text) are service_role EXECUTE=true; anon=false, authenticated=false. has_active_membership() is authenticated EXECUTE=true, anon=false. Anonymous-role execution test of has_active_membership() returned PostgreSQL 42501 permission denied, expected. This denied operation changed no data.
- public.course_access count=2, matching previous count.
- Security advisor WARN leaked-password protection disabled. Five RLS-without-policy INFO findings remain (private tables must not be opened automatically).
- Draft PR #5 still draft, staged tests/task-69-isolated-claims.sql and tests/task-70-actual-source-webhook.cjs still present in branch. No merge or deployment.
- Previous read-only Stripe/Supabase comparison confirms sandbox membership active, cancel_at_period_end=true, same price and expiry 2026-12-12T22:59:03Z.

## Task status
101 BLOCKED: Edge Function secret/feature flag values cannot be verified with available read-only connector. Never reveal secrets or assume flag state.
102 BLOCKED: historical receipt marked sent but retry queue accepted/provider_message_id NULL; provider Resend delivery evidence unavailable. No resend.
103 PARTIAL PASS: installed RPC signature/role restrictions and candidate source reviewed; real runtime test pending.
104 PARTIAL: isolated test suite and actual-source mock passed previously; 12 Nov Stripe events retrieved and historical HTTP 400/422 logs correlated by time, not by delivery ID. No event replay.
105 PARTIAL: isolated atomic duplicate/lease tests passed; end-to-end duplicate prevention not demonstrated.
106 PARTIAL: two sandbox course_access rows remain; new purchase-to-access flow not exercised.
107 PARTIAL PASS: anonymous execution of has_active_membership denied; RLS SELECT ownership policy for course_access previously verified. Real unauthorized content fetch pending.
108 PARTIAL PASS: sandbox subscription Stripe/Supabase status/price/cancellation/expiry aligned; renewal, failure, expiry not exercised.
109 PENDING: no safe authenticated test credentials/session to exercise registration/login/recovery. Existing GET /auth/v1/user HTTP 200 logs are historical, not fresh end-to-end test.
110 HOLD: no release until Resend provider evidence, signed Stripe event delivery response analysis, flags and E2E gates pass.

## Security notes
No role grants, policy changes, Auth settings changes, secret reads, emails, payments, Checkout Sessions, subscription or entitlement changes, live billing changes, homepage changes, Supabase plan changes, deployments or merges.

Next safe sequence: read-only Stripe Workbench delivery response bodies and Resend message history; enable leaked-password protection only if Free plan permits and user approves; run isolated test harness after verified fixes; preserve all existing state.

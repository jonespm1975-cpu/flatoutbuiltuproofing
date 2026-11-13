# Task 41 — Sandbox webhook atomic email claim integration
Date: 2026-11-13 UTC
Status: STAGED IN GITHUB, NOT DEPLOYED.

## Source
supabase/functions/stripe-test-webhook/task-41-v26-index.ts, commit 02137a3da6a27b544be038490dd1a08cfd92708a.
Based on deployed stripe-test-webhook v25, replacing direct receipt read/send/update with:
- explicit SANDBOX_COURSE_EMAIL_SENDING_ENABLED === true flag (default disabled)
- cs_test_ session guard
- public.claim_test_course_confirmation_email RPC (service-role-only)
- provider acceptance with same Resend idempotency key
- public.finish_test_course_confirmation_email RPC to update queue + receipt atomically
- failed sends finalize as retryable failures
- missing claims do not send

## Verified static checks
7/7 passed: flag precedes claim; claim precedes provider fetch; finish follows fetch; direct receipt sent update removed; Stripe signature verification retained; cs_test_ guard present; subscription routing retained.
Static checks are NOT runtime tests.

## Outstanding tests and deployment gate
No actual-source isolated runtime tests were executed; no concurrent webhook mock run; no expired-lease or stale-token integration test; no provider failure simulation. Consequently NOT DEPLOYED. Existing v25 still sends directly if previously enabled. Existing sandbox retry worker v10 remains dry-run only.

## Read-only state after
course_access=2; purchase_confirmations=1; sandbox_email_retry_queue=1; all membership_subscriptions cancel_at_period_end=true.

## Safety
No payments, Stripe sessions, provider emails, live billing changes, entitlement writes, subscription modifications, homepage changes or Supabase plan changes.

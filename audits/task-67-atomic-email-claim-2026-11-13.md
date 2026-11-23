# Task 67 — Sandbox atomic email claim candidate and test gate
Date: 2026-11-13 UTC
Status: CODE STAGED; TEST GATE NOT PASSED; NOT DEPLOYED

## Changes staged on isolated GitHub branch
- File: supabase/functions/stripe-test-webhook/task67-candidate.ts
- Derived from actual deployed Supabase stripe-test-webhook v25.
- Replaced non-atomic SELECT/send/UPDATE with service-role-only claim_test_course_confirmation_email and finish_test_course_confirmation_email RPCs.
- Added SANDBOX_COURSE_EMAIL_SEND_ENABLED exact-string true gate, default off.
- No sending when claim missing, already leased, not due or RPC fails.
- Retained Resend per-session Idempotency-Key.
- Failed explicit provider response releases lease through finish(false) and bounded database backoff.
- Ambiguous provider response/timeout leaves lease for reconciliation; no immediate retry.
- Accepted provider response requires non-empty provider id; finish(true) records acceptance.
- Source-level checks confirmed claim/finish RPC names and new flag present, old confirmation_email_status SELECT removed.

## Critical unresolved risks
1. No execution of actual-source handler with mocked Stripe/Supabase/Resend yet. Source inspection is NOT a passing runtime test.
2. No two independent Postgres connections available through the present SQL connector to demonstrate simultaneous claims and SKIP LOCKED behavior. Must run isolated pg clients in an environment with independent sessions.
3. No synthetic fixture concurrency, expired-lease, stale-token, failed-send retry or ambiguous-provider replay results.
4. Resend provider idempotency retention and behavior on timeout must be verified; lease expiry alone cannot guarantee no duplicate delivery after an ambiguous provider acceptance.
5. Database queue auto-creation trigger and atomicity relative to receipt insertion require a dedicated test.
6. Existing entitlement and subscription cancellation pre/post invariants were not re-run after synthetic test because no such test was executed.
7. Candidate TypeScript/Deno compile and integration test still required. Do not deploy without this.

## Required gate
- Actual handler executes against isolated mocked Stripe and Resend with a dedicated synthetic database.
- Independent Postgres connections simultaneously claim one due row; exactly one receives a token.
- Test duplicate webhook, stale/invalid token, lease expiry, explicit provider failure, backoff, attempt limit, accepted provider response, and ambiguous timeout.
- Verify no real emails, payments or Checkout sessions; unchanged existing entitlements, subscriptions, homepage, live billing and Free plan.
- Deploy only after all assertions pass and evidence is saved.

No emails, payments, Checkout sessions, live billing changes, subscriptions changes, homepage changes, Supabase plan changes, SQL mutations or Edge Function deployments were performed by Task 67.

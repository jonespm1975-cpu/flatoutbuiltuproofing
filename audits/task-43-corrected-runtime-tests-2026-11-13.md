# Task 43 — Corrected actual-source isolated test
Date: 2026-11-13 UTC
Decision: HOLD DEPLOYMENT until database/queue integration gap resolved.

## Actual source tested
GitHub supabase/functions/stripe-test-webhook/task-41-v26-index.ts, blob 42f34d62ff04365d9888adc76f6f6e35aa8510ba. Removed TS-only annotations and npm imports for JS VM execution; mocked Stripe, Supabase, Deno and fetch. Fixed Task 42 mock STRIPE_TEST_UNLOCK_ENABLED to exact 'true'. All provider requests were mock only.

## Mocked runtime checks
1. Flag disabled: no provider call and no claim — PASS.
2. Two concurrent deliveries: one claim and one mocked provider send — PASS.
3. Replay: no second mocked send — PASS.
4. Provider failure then retry: pending followed by successful simulated send — PASS.
5. Invalid finish token rejected by mocked RPC — PASS.
6. Expired lease rejects stale token in mocked RPC — PASS.
7. Duplicate entitlement upserts: one unique mocked entitlement — PASS.
Total 7/7 mocked checks PASS. Not a live integration or proof of database concurrency.

## Actual Supabase read-only checks
service_role can execute claim and finish; anon cannot execute either; authenticated cannot claim.
course_access rows=2; sandbox_email_retry_queue rows=1; all membership_subscriptions cancel_at_period_end=true.

## Unresolved deployment blockers
- Revised webhook inserts purchase_confirmations but does not ensure sandbox_email_retry_queue row exists for new sessions; claim RPC requires queue row. Existing queue row=1 is not evidence future sessions enqueue. Without a verified enqueue trigger or explicit idempotent queue insertion, new email claims can silently fail.
- No actual database concurrent claim test, actual expired lease or finish test.
- Mock provider does not test Resend semantics, and no emails may be sent under user restrictions.
- The revised webhook would be fail-closed for email sending by default, but deploying without checking actual environment and queue insertion could disrupt existing confirmation behaviour.

Therefore deployed stripe-test-webhook remains v25. No deploy; no Stripe payments or sessions; no real emails; no subscription or entitlement writes; no live billing/homepage/Supabase plan changes.
Next: audit enqueue trigger and implement safe queue provisioning; run rollback-only database claim/finish tests; then deploy only after review.

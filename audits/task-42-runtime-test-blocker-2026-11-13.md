# Task 42 — Actual-source isolated execution attempt
Date: 2026-11-13 UTC
Status: BLOCKED — NO DEPLOYMENT.

Source: supabase/functions/stripe-test-webhook/task-41-v26-index.ts (GitHub blob 42f34d62ff04365d9888adc76f6f6e35aa8510ba). Fetched exact source, removed TypeScript annotations and npm imports for isolated JS evaluation, injected mocked Stripe, Supabase, Deno, Response and fetch. No real network calls, emails or Stripe operations.

First execution results:
- disabled no send: FAIL — returned HTTP 503 Unlocking not enabled.
- concurrent one claim one send: FAIL — did not reach claim logic.
- duplicate replay no send: FAIL — did not reach claim logic.
- failed provider retry: FAIL — did not reach claim logic.
- invalid finish token rejected: PASS (mock RPC contract only).
- expired lease rejects stale token: PASS (mock RPC contract only).

Root cause: test harness mocked Deno.env.get with generic "test" for STRIPE_TEST_UNLOCK_ENABLED; actual webhook correctly fails closed unless exact "true". This is a HARNESS setup failure, not a verified production code defect. The two passing token checks exercise mock RPC behavior, not actual database SQL. Do not treat them as real DB verification.

Next: fix harness env map, rerun all actual-source tests, verify actual database RPC token/expiry semantics using rollback-only tests, verify claim under real concurrency where feasible, then consider deployment. Note sandbox email sending must remain disabled by default; avoid activating real Resend.

No Edge Function deployment, payments, Stripe Checkout sessions, email sends, Supabase database writes, live billing, entitlements, subscription cancellation, homepage or plan changes.

# Task 152 — Executed isolated webhook mirror tests
Date: 2026-11-13 UTC

## Method
Fetched tests/task-151-sandbox-webhook-mirror.test.mjs from audit/sandbox-webhook-hardening-2026-11-13. Reconstructed its text locally, ran Node built-in test runner. Initial test result: 17 tests, 8 passed, 9 failed, exit code 1. Root cause was an incomplete UUID regex in the new mirror test file: the fourth UUID group was omitted. The deployed stripe-test-webhook v25 source has the complete UUID regex. Corrected the test regex to `^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (case insensitive), reran tests locally: 17 passed, 0 failed, 0 skipped, exit code 0, 95.044929 ms. Committed same regex correction to the isolated audit branch in commit 94df641ce0dec7e1b648d7e628ad6885c2886dfb.

## Limits
These tests mirror only part of the deployed source and do not invoke deployed Edge Functions, Stripe, Supabase Auth/DB, or Resend. They cannot establish historical Stripe 422 root causes, database concurrency, or actual email delivery. No tests of real webhook signatures or live accounts were performed.

## Next
Add mocked Resend response-ID handling and idempotent queue transition tests on the isolated branch; review historical Stripe delivery attempts and Resend provider records if connector access becomes available.

## Safety
No external sends, charges, Checkout sessions, retries, deployments, database writes, production settings, existing subscription/entitlement changes, homepage changes or plan upgrades.

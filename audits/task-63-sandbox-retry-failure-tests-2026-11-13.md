# Task 63 — Sandbox retry lease and failure handling tests
Date: 2026-11-13 UTC
Status: DATABASE TESTS PASS; WEBHOOK CONCURRENCY NOT YET VERIFIED

## Method
Executed rollback-only transactions against deployed internal.claim_sandbox_email_retry_v2 and internal.finish_sandbox_email_retry_v3. Existing sandbox record was temporarily adjusted inside each transaction; all changes rolled back. No Resend or Stripe calls.

## Results
1. Expired lease with attempts=2: claim returned one row, attempt_number=3 and non-null claim token. PASS.
2. Wrong token on active lease: finish returned false. PASS.
3. Failed send with attempts=2 and correct token: queue status pending, future next_attempt_at, token cleared. PASS.
4. Fifth failed send with correct token: queue status failed, attempts=5; receipt confirmation_email_status remains pending. PASS against current code; needs explicit operational monitoring/recovery policy.

## Post-test verification
Existing queue status accepted, attempts 0, lease token null, linked receipt status sent. All test changes rolled back.

## Outstanding gates
True multi-connection concurrency, webhook integration using shared single-session claim, provider acceptance followed by DB failure, and production-safe deployment verification. Do not enable automated retry or deploy webhook on these results alone.

## Safety
No email sent, Stripe payment or Checkout session created, customer entitlement or subscription changed, live billing/homepage/plan changed, or Edge Function deployed.

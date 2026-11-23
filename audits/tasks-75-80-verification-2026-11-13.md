# Tasks 75–80 verification and safety gate — 2026-11-13 UTC

## Task 75 — sandbox webhook deployment
BLOCKED. Actual isolated PostgreSQL 17 Actions run 43344774099 job 131621341732 succeeded. Retrieved job logs contain six PASS groups: two independent connection single winner; invalid token/non-sandbox/duplicate; failure backoff; expired lease reclaim; stale tokens/replacement/provider ID; retry ceiling and synthetic entitlement. Task 70 mocked webhook job also succeeded. However the existing sandbox email queue remains accepted with attempts=0 and provider_message_id null while purchase confirmation says sent. This historical inconsistency and ambiguous provider timeout reconciliation have not been cleared. Deployed stripe-test-webhook remains version 25. DO NOT DEPLOY or merge.

## Task 76 — £9.99 checkout
PARTIAL. Stripe live GET CheckoutSessions returned 14 sessions, expired/unpaid, mostly 999 pence (one 1209); no successful live checkout was observed in the returned list. Stripe sandbox returned completed paid 999-pence course sessions. No new checkout created. End-to-end live webhook entitlement fulfilment remains unverified.

## Task 77 — £1.99 membership
PARTIAL. Stripe live GET Subscriptions returned zero. Sandbox GET Subscriptions returned one active, cancel_at_period_end=true; Supabase membership_subscriptions one active test row with cancel_at_period_end=true. Existing cancellation preserved. Sandbox paid 199-pence subscription checkout observed. Renewal/cancel portal end-to-end not executed.

## Task 78 — duplicate protection
PARTIAL. Task 70 actual-source mocked webhook duplicate invocation assertion passed; Task 69/72 genuine isolated PostgreSQL atomic claim and stale token assertions passed. Live subscription checkout duplication and provider-side Resend idempotency not verified end-to-end.

## Task 79 — failed payments, renewal and cancellation
PARTIAL. Existing sandbox cancellation flag agrees between Stripe and Supabase. No safe real renewal/failure events exercised; tests pending.

## Task 80 — account auth and recovery
OUTSTANDING. No authenticated test-user login, registration or password-reset end-to-end test executed in this pass. No user accounts altered.

## Preservation
Supabase course_access has 2 existing rows; no mutation. Queue still accepted attempts=0 provider ID absent. No real email, Stripe payment or Checkout Session created; no live billing or subscription changes; no homepage or Free plan changes.

## Decision
Tasks 75–80 cannot truthfully all be marked complete. Gate Task 75 on Resend provider reconciliation and missing end-to-end checks. Keep PR #5 draft, unmerged, webhook undeployed.

# Task 65 — Isolated two-connection PostgreSQL test setup
Date: 2026-11-13 UTC
Status: HARNESS AND CI WORKFLOW COMMITTED; POSTGRESQL EXECUTION RESULT NOT VERIFIED

## Artifacts
- tests/task65_claim_concurrency.py
- .github/workflows/task65-claim-concurrency.yml
- proposals/task-59-sandbox-single-session-claim.sql (actual proposed SQL under test)

## Isolation
Workflow starts a disposable PostgreSQL 16 service container with a synthetic cs_test_ fixture, no Supabase production credentials, no Stripe or Resend calls. Python test uses two independent psycopg connections.

## Assertions implemented
1. Connection A claims a pending fixture and holds transaction lock; B attempts claim concurrently with 2-second lock timeout and expects zero rows via SKIP LOCKED.
2. A commits; B still must not claim while lease is active.
3. Lease is expired; B must reclaim with incremented attempt and rotated token.
4. SQL execute grants should deny anon/authenticated and permit service_role.

## Verification actually performed
Local Python source compiled with py_compile (syntax only). GitHub files created and committed. No verified GitHub Actions run or PostgreSQL test logs available at audit time. DO NOT mark concurrency PASS until workflow logs demonstrate success. Note this is a schema-compatible isolated fixture, not a full production schema replica.

## Safety
No production database writes, emails, payments, Checkout sessions, live billing changes, subscription changes, entitlement changes, homepage changes, or Supabase plan changes. No Edge Function deployment.

## Gate
Inspect GitHub Actions workflow run, repair any test failures, then record exact successful run URL and job logs before deployment. Next integrate sandbox webhook and shared claim, and run provider-dispatch concurrency tests separately.

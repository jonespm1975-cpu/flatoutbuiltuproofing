# Task 36 — Actual-source mocked integration harness
Date: 2026-11-13 UTC
Status: HARNESS COMMITTED, EXECUTION NOT VERIFIED.

## Sources
Retrieved deployed stripe-test-checkout v24 and stripe-test-webhook v25. Existing archived sources:
- supabase/functions/stripe-test-checkout/task-31-v24-index.ts
- supabase/functions/stripe-test-webhook/task-33-v25-index.ts

Created tests/task-36-actual-source-harness.cjs, using TypeScript transpilation and isolated Node vm with mocked Deno.serve, Stripe, Supabase and fetch. It is designed to execute actual archived handler source, not a simplified behavioural model. Test scenarios coded: owned, pending, Stripe creation failure, open-session recovery, recovery ownership mismatch and invalid webhook signature.

## Important execution limitation
The GitHub file was created successfully, but this harness was NOT executed in this turn: connected GitHub and Supabase tools cannot run the local test runner, and the working container could not retrieve the private/remote GitHub source. Thus ZERO runtime assertions are claimed passed. This is a prepared test artifact, not completed certification.

Run in checked-out repo using Node 22:
npm install --no-save typescript@5.7.3
node tests/task-36-actual-source-harness.cjs

The harness does not call external Stripe/Supabase/Resend APIs. Its mock webhook only tests invalid signature; duplicate paid webhook and email concurrency tests still need implementation and execution. Concurrent real Postgres tests also remain outstanding.

## Preservation verified
Supabase SQL: reservations=0, entitlements=2, membership cancellation true. No Stripe sessions or payments created, no live billing, homepage, Supabase plan or subscription mutation.

## Next steps
Run harness in isolated CI; fix any test harness defects; extend to valid webhook, repeated delivery, concurrent email dispatch and mocked persistence; then inspect logs and archive actual pass/fail output.

# Tasks 284–293 — staged checkout/webhook offline tests — 2026-11-13

## Scope and safety
Ran existing repository tests from branch `launch-checkout-terms-alignment-20261113` in an isolated temporary directory using Node's built-in test runner. The tests made no network requests. No repo source was changed by the test run, and no Stripe, Supabase, Resend or production setting was contacted or changed.

## Ten test results
Node reported **10 passed, 0 failed**:

- **284 — Checkout requires configured approved terms version:** PASS.
- **285 — Checkout records the required consent fields and customer identity:** PASS.
- **286 — Checkout and webhook agree on price, course and metadata:** PASS.
- **287 — Candidate webhook verifies signed events and contains no direct Resend send:** PASS.
- **288 — Live checkout and course unlock remain separately gated:** PASS.
- **289 — Candidate webhook requires signed, live events:** PASS.
- **290 — Candidate course webhook excludes subscription-mode Checkout:** PASS.
- **291 — Candidate validates course, consent and the approved terms version:** PASS.
- **292 — Candidate uses the atomic fulfilment RPC and leaves email to the queue:** PASS.
- **293 — Offline race reproduction:** PASS. The deterministic mock reproduces two concurrent handlers both attempting a send with the same idempotency key; the mock atomic-claim guard permits one sender.

## What this does and does not establish
These are source-contract and deterministic mock tests. Task 293 is not an execution of the deployed webhook or the database `SKIP LOCKED` claim functions. This environment has Node, but no `psql`, Docker or Deno; no direct PostgreSQL URL was available. A genuine two-connection database test remains unproven.

The candidate checkout and webhook remain staged and undeployed. No Stripe event retry, payment, email, production deployment, or live setting change occurred.

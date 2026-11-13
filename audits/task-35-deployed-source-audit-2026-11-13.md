# Task 35 — Deployed-source audit and test gap
Date: 2026-11-13 UTC
Status: PARTIAL — ACTUAL SOURCE INSPECTED; MOCKED EXECUTION NOT COMPLETED.

Retrieved deployed Supabase stripe-test-checkout v24 and stripe-test-webhook v25. Inspected 13 source invariants: 12 passed, 1 failed (no verified durable DB email-send claim/lease). Source-level checks are NOT executable integration tests.

Passed checks: both checkout rollout flags, JWT verification, consent, reservation-before-create, Stripe idempotency key, read-only recovery, webhook signature verification, rejection of live events, line-item price validation, unique entitlement upsert, reservation reconciliation, Resend idempotency key.

Finding: webhook checks confirmation_email_status then sends through Resend, but has no confirmed atomic database claim around concurrent delivery. Provider idempotency may mitigate but cannot be treated as a proven durable lock. Do not make speculative schema changes without validating email queue worker interactions.

Task 35 incomplete: actual deployed TypeScript source was NOT executed in a dependency-injected mock runtime. Signature cryptography, concurrent SQL transactions, webhook race and email provider idempotency were not runtime-tested. No deployment or database mutations performed. No Stripe Checkout session/payment created. V2 activation flag remains unverified.

Next: build executable source-import harness using Deno-compatible module mocking and isolated fake Stripe/Supabase, run concurrent duplicate webhook tests, then design a verified atomic email-send lease coordinated with retry worker if necessary.

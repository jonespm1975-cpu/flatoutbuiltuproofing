# Resend sandbox retry integration — implementation gate

Status: **design only — NOT enabled** (12 November 2026).

## Verified current state
- Supabase `purchase-email-retry-worker` v2 ACTIVE, read-only dry-run, requires exact service-role bearer token; does not claim, send, or schedule.
- Internal SQL claim, finish, bounded retry and lease recovery routines exist; sandbox queue still contains one pending job with zero attempts.
- Resend sender-domain status was previously reported as Partially Verified / SPF missing; **not independently rechecked in this task**.

## Required idempotency contract
- One stable key per confirmation, not per attempt: `purchase-confirmation:<stripe_checkout_session_id>`.
- Send to Resend with its documented idempotency header only after verifying current Resend API requirements; key must be stable across lease recovery, retries, and worker restarts. Never put API keys, customer addresses, or checkout session IDs into logs.
- Keep provider message ID on accepted responses. Provider HTTP acceptance is **not proof of delivery**.
- Important limitation: a provider idempotency retention window may expire. Treat delivery as at-least-once, not guaranteed exactly once. Do not retry ambiguous network failures blindly without a reconciliation policy.

## Safety gates before enabling
1. Verify Resend DNS domain SPF and DKIM; ensure sending address matches verified domain.
2. Validate provider idempotency semantics and retention window using current documentation.
3. Add lease ownership token to avoid old workers completing a renewed lease; attempt number alone is insufficient for strong fencing.
4. Exercise two-connection concurrency tests, lease expiry, attempt cap, and ambiguous provider timeout.
5. Signed sandbox Stripe webhook -> receipt -> queue -> provider mock -> access checks.
6. Use sandbox-only recipient allowlist and explicit off-by-default sending flag; no live checkout or customer sends.
7. Confirm privacy, cancellation, and purchase confirmation wording before production rollout.

Do not activate the sender, scheduler, live payments, or any real customer email as part of this document.

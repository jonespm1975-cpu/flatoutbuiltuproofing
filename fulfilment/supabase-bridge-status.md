# Supabase 24-course receipt bridge — verified status

Last staged: 21 November 2026.

## Live database read-only evidence
- `purchase_confirmations`: primary key `stripe_checkout_session_id`. Fields include `user_id`, `course_id`, `paid_amount_pence`, `currency`, `consent_recorded_at`, `terms_version`, and `confirmation_email_status`.
- `course_access`: unique `(user_id,course_id)` and unique `stripe_checkout_session_id` already exist.
- `course_checkout_reservations`: primary key `(user_id,course_id,environment)`, but its status and SQL RPC currently hard-code the legacy beginner course.
- Existing receipt triggers enqueue `cs_test_` orders only when `terms_version='sandbox-test'`, and `cs_live_` orders when email status pending.
- Existing live email worker only supports `course_id='beginner-training-course'` and a fixed receipt name; its finalizer grants access only to that course.

## Changes committed to staging
- `sandbox-receipt-adapter.mjs`: validates 24 immutable course IDs and minimum fields, rejects cross-user/cross-course conflicts, and calls an injected *atomic* writer.
- `sandbox-receipt-adapter.test.mjs`: all 24 mock inserts/replays, mismatched account and invalid payload checks passed.
- `staging-rpc-draft.sql`: commented design only, not executed. Would insert one receipt per Stripe session in one transaction, without issuing emails or unlocking paid courses.

## Release barriers
1. Create verified sandbox `price_` IDs for all 24 courses; do not share a Stripe price across courses.
2. Add server-side per-course sandbox reservations and a service-role-only atomic receipt RPC, reviewed separately for permissions.
3. Integrate real Stripe signature verification, re-fetch Checkout line items, and verify user/course/price under the same environment.
4. Decide whether paid entitlement is granted on confirmed payment or after durable receipt; update email/outbox worker safely for course-specific titles and retry behaviour.
5. Add *genuinely separate database connection* concurrency tests, plus signed sandbox end-to-end tests.
6. No live checkout, email worker or course-entitlement deployment until those tests pass.

**Security settings and production data remain unchanged.**

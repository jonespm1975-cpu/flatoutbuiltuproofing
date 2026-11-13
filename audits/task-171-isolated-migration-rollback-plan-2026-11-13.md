# Task 171 — isolated migration and rollback preparation
Date: 2026-11-13

## Verified
Supabase list_branches returned an empty list. No existing development branch is available for isolated integration tests. No branch created (branch compute may incur charges). No database DDL or DML executed.

## Proposed migration sequence (NOT APPLIED)
1. Establish a disposable isolated PostgreSQL/Supabase test environment and take schema-only snapshot of relevant purchase confirmation, course access, and live email outbox objects. Never copy real customer email addresses into fixtures.
2. Seed synthetic cs_live_ sessions and synthetic users/receipts in the isolated environment only. Ensure unique outbox primary key and receipt FK are preserved.
3. Implement webhook change in a separate review branch: after verified Stripe payment and consent, write course grant and receipt/outbox atomically; do not send Resend emails from webhook. Acknowledge only durable fulfilment success.
4. Ensure the worker is the only sender; keep both sending flags disabled until controlled rollout. Add a reconciled/uncertain status or separate reconciliation mechanism for provider-accepted-but-DB-failed outcomes. Review CHECK constraints and status transitions before migration.
5. Test duplicate Stripe event, two simultaneous claims, wrong token, expired lease, retry limit, already-sent receipt, provider accepted + DB failure, and fail-closed auth/flags. Assert no duplicate sends or access loss.
6. Review production cutover for existing sent receipts and queued jobs. Do not requeue accepted or already-sent purchases. Preserve membership and course entitlements.
7. Rollback: keep new sender disabled, restore previous webhook artifact only after validating no duplicate sender activation, and reconcile pending/uncertain outbox records before resuming. Do not blindly revert schema that now holds new records.
8. Require explicit production change approval after tests and documented review.

## Test acceptance criteria
- Zero customer emails/payments during tests.
- Exactly one entitlement per user/course and one email job per session.
- Exactly one successful claim across independent concurrent database sessions.
- Provider acceptance cannot lead to automatic duplicate send when finalisation is uncertain.
- Failed email delivery cannot undo granted access or cause unsafe duplicate billing.
- Rollback preserves all existing receipts, entitlements, subscriptions and cancellation state.

## Blocker
No isolated Supabase branch currently exists. Creating one may incur cost; do not create without approved cost. A local disposable PostgreSQL environment is an alternative. All steps above are plans, not executed tests.

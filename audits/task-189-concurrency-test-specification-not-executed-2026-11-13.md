# Task 189 — two-connection concurrency execution plan (NOT RUN)
Date: 2026-11-13
Prerequisite: Task 188 isolated PostgreSQL database, not yet available.

## Setup
- Disposable database with matching production schema, roles, RLS, trigger and synthetic auth users.
- Apply Task 187 v4 reviewed SQL in that database only.
- Two independent database sessions A/B; both begin transactions and synchronize at a barrier.
- Synthetic IDs and sessions only; no Stripe API, emails, customer records or production keys.

## Mandatory tests and expected results
1. Same session, same payload concurrently: both transactions commit successfully or one waits and then succeeds; exactly one purchase_confirmations row, at most one course_access row, exactly one email outbox job.
2. Same session, conflicting user or course: one succeeds and the other fails closed; never change existing receipt/grant.
3. Same user/course, different sessions: both receipts retained, one existing entitlement retained, two outbox jobs (one per paid receipt); verify whether product policy permits repeat purchases.
4. Same session, different amount/currency/terms/consent: conflicting attempt rejected and original receipt immutable.
5. Receipt insertion deliberately fails after attempted grant: full transaction rolls back, leaving no orphan entitlement.
6. Existing grant for same user/course and different session: preserve grant and record new legitimate paid receipt without reassignment.
7. Two unrelated sessions: no accidental global lock serialization; both can succeed.
8. Service role wrapper execute permitted; anon/authenticated denied; internal core not directly exposed.
9. Verify existing AFTER INSERT trigger enqueues once per receipt and no external email is sent.
10. Repeat under 20 overlapping transaction runs and log SQLSTATE, outcomes, row counts, lock wait durations.

## Known issues to resolve before deployment
- v4 wrapper trusts service_role-supplied arguments. Stripe signature, livemode, amount, line-item price, customer, consent and terms must be checked in webhook.
- Hardcoded course ID removed from SQL v4; webhook must pass its configured allowed course ID.
- Current webhook sends Resend directly and performs separate REST writes; do not switch to v4 until Task 190 single-sender change and rollback plan are ready.
- No disposable DB exists yet; these are test specifications, NOT executed results.

## Evidence required to close Task 189
Actual two-connection transcripts, database version, schema/role definitions, test inputs, SQLSTATE and final assertions. Do not mark complete from static review.

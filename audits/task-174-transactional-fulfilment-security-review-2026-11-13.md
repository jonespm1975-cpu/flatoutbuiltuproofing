# Task 174 — transactional fulfilment SQL security review
Date: 2026-11-13. Read-only schema inspection; no migrations executed.

## Confirmed database constraints
- course_access has unique (user_id, course_id) and unique stripe_checkout_session_id, plus user FK.
- purchase_confirmations primary key is stripe_checkout_session_id, with user FK.
- Task 173 draft uses one PL/pgSQL transaction, advisory lock by session, and INSERT ON CONFLICT DO NOTHING for existing grant and receipt. Existing receipt conflict is checked on user/course/amount/currency, but consent timestamp is not checked.

## Review findings and blockers
1. SECURITY: RPC arguments are not proof of payment. Only trusted webhook after Stripe signature, live account, price/line items, paid status, customer mapping and consent validation may call. Revoke EXECUTE from PUBLIC/anon/authenticated atomically in the migration; verify permissions after install. A service-role key must never reach browser.
2. DUPLICATE PURCHASE: existing user/course grant with different session is preserved; a new purchase confirmation/outbox can still be created. This may produce a second purchase confirmation email, which is correct only if a second real payment occurred. Decide refund/duplicate-purchase policy before launch.
3. SESSION CONFLICT: same session already attached to a different user/course grant can trigger unique violation; transaction must fail closed. Ensure webhook returns actionable retry/error and no partial writes.
4. RECEIPT CONFLICT: existing receipt comparison should also address consent timestamp and immutable terms metadata. Existing sent receipt must never reset to pending.
5. CONCURRENCY: advisory lock serializes same session only; concurrent different sessions for same user/course rely on unique index. Need actual two-connection tests for both patterns.
6. ATOMICITY: installed trigger should enqueue within the receipt insert transaction, but confirm behaviour with isolated rollback-only fixtures.
7. CUTOVER: remove direct Resend sending from webhook only after worker and queue reconciliation are tested. Worker flags stay disabled until explicit authorisation; avoid email loss during cutover.
8. ROLLBACK: do not drop queue tables or delete receipts/grants. Rollback must preserve in-flight records.

## Status
Static review only. Task 173 draft is NOT production ready. No live database writes, payments, emails, deployments, or subscriptions changed.

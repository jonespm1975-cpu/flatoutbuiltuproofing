# Tasks 226–235 — Ten payment and email checks — 2026-11-13

All operations read-only. No Stripe payment, email, webhook replay, entitlement edit, deployment or subscription change.

| Task | Check | Result |
|---|---|---|
| 226 | Live email outbox status distribution | PASS: no rows |
| 227 | Privileges on three fulfilment and email retry RPCs | PASS: service_role EXECUTE true; anon/authenticated false |
| 228 | Purchase confirmation queue triggers | PASS: both live and sandbox triggers enabled |
| 229 | Course/receipt schema compatibility | PASS: course/session fields present; receipt has currency and terms_version |
| 230 | Leftover isolated test course_access rows | PASS: zero |
| 231 | Leftover isolated test purchase_confirmations rows | PASS: zero |
| 232 | Leftover isolated test live outbox rows | PASS: zero |
| 233 | Deployed course sandbox webhook | PASS: ACTIVE v25 |
| 234 | Historical course access rows with session IDs | OBSERVED: 2 rows, 2 distinct sessions |
| 235 | Historical purchase receipt rows with session IDs | OBSERVED: 1 row, 1 distinct session |

Additional read-only reconciliation: LEFT JOIN course_access to purchase_confirmations on stripe_checkout_session_id showed two course_access rows for beginner-training-course with no matching receipt. This is a potential historical data reconciliation issue, not proof of unauthorized access. Do not delete or rewrite records without reconciling original Stripe session payments and historical deployment behavior.

Outstanding from earlier: £1.99 subscription checkout Stripe event evt_1Ub6xTKS41qhUQTKCAsjwHU2 pending_webhooks=1; genuine two-connection claim contention unverified; Resend provider delivery status not independently queried. Ten checks above do NOT clear those blockers.

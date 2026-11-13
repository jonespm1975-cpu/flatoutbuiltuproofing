# Task 167 — isolated email separation simulation
Date: 2026-11-13

## Scope
Locally executed Node.js model of proposed durable outbox behaviour. No Supabase calls, emails, payments, Stripe sessions or production changes in test. This is NOT an integration test of deployed code.

## Results
node --test task-167-test.mjs: 7 tests, 7 passed, 0 failed.
1. Duplicate fulfilment yields one outbox row.
2. Payment acknowledgement is independent of email sending.
3. Non-sandbox session rejected.
4. Only one claim wins.
5. Wrong lease token cannot finish.
6. Accepted job cannot be reclaimed.
7. Uncertain provider outcome blocks automatic retry.

## Limitations and next gate
- In-memory sequential test, not two actual database connections.
- No real Resend API idempotency behaviour, network fault injection, transaction isolation or actual deployed worker exercised.
- The model deliberately parks uncertain sends rather than automatically retrying; production requires manual/provider reconciliation and a policy for unresolved jobs.
- Before any production deployment, implement migration on disposable test tables, verify transactional guarantees with two database connections and simulated provider failure, then review security and rollback plan.

## Model pseudocode
```
fulfil(s): require sandbox; upsert receipt pending and unique outbox; acknowledge without email
claim(s,token): only pending/expired, receipt pending, attempts<5; atomically lease
finish(s,token,providerId): require matching lease and provider ID; set accepted and receipt sent
uncertain(s): park job as uncertain; never automatically resend without reconciliation
```

No live configuration, customer entitlements, subscriptions, homepage, or Supabase Free plan changed.

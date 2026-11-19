# Automation audit — Tasks 274–281 — 2026-11-14 17:05 UTC

Non-destructive fresh checks; no writes to Supabase, Stripe or production. All checks executed against connected accounts.

274. Supabase live email outbox rows: 0 (PASS: no queued live jobs at query time).
275. Course access without purchase confirmation: 2 (UNCHANGED, historical sandbox discrepancy).
276. Purchase confirmation without course access: 1 (UNCHANGED, historical sandbox discrepancy).
277. Live-prefixed course access records: 0 (observation, not proof of live checkout readiness).
278. Live-prefixed purchase confirmation records: 0 (observation).
279. Pending purchase confirmation email records: 0 (observation).
280. Sent purchase confirmation email records: 1, failed records: 0 (DB-only; not independent provider delivery proof).
281. Stripe test event evt_1Ub6xTKS41qhUQTKCAsjwHU2: type checkout.session.completed, livemode=false, pending_webhooks=1 (still BLOCKED). No retry performed.

Additional deployed-function inventory: stripe-test-webhook v25 ACTIVE, purchase-email-retry-worker v10 ACTIVE, membership-test-webhook v9 ACTIVE. ACTIVE denotes deployed availability, NOT email sending enabled or tests passed. Production function stripe-webhook v31 ACTIVE. No deployment performed.

Historical tax difference was reconciled in previous audit: first course session subtotal 999 pence + 200 pence tax = 1199; later sessions total 999 pence with tax included. Do not mutate historical receipts/entitlements automatically.

Remaining blockers: independent two-connection concurrent claim test (no direct PostgreSQL connection), historical sandbox receipts/access mismatches requiring intent review, manual Stripe Workbench resend to course-only sandbox webhook (forbidden by automation guardrails), and direct Resend provider status (no connected Resend logs). Do not claim tasks 269–273 complete.

Evidence is point-in-time, read-only, no customer charges, emails, checkout sessions, webhook retries, production deployments, or subscription/entitlement changes.

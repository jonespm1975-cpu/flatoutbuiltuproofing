# Tasks 274–283 — purchase fulfilment safety tests — 2026-11-13

## Scope and safety
Read-only checks and rollback-only SQL tests against project `fhyhshakmvqwzdyannec`. No Stripe payment/session was created, no email was sent, no webhook was replayed, no production code or settings were changed, and no database records were left behind.

## Tasks and results
All tests called the installed `public.fulfil_live_course_purchase_v4` function. The invalid-evidence suite completed without exceptions, meaning each input was rejected with the expected `Invalid purchase evidence` error before any write.

- **274 — Null Stripe session:** PASS; rejected.
- **275 — Test-mode session on live fulfilment RPC:** PASS; `cs_test_` rejected.
- **276 — Missing purchaser UUID:** PASS; rejected.
- **277 — Wrong course ID:** PASS; rejected.
- **278 — Wrong amount:** PASS; £11.99/1199 pence rejected where the live lesson amount is 999 pence.
- **279 — Wrong currency:** PASS; USD rejected.
- **280 — Missing consent timestamp:** PASS; rejected.
- **281 — Future consent timestamp:** PASS; rejected.
- **282 — Unapproved terms versions:** PASS; both draft-review-required and sandbox-test values rejected.
- **283 — Rollback-only positive integration:** PASS; a synthetic live-prefixed test session fulfilled twice idempotently, produced one pending receipt and one pending outbox row, preserved any pre-existing course entitlement, and was then rolled back. A post-rollback check found no synthetic receipt, access row or outbox row.

## Post-test state
Read-only counts remained unchanged after rollback:
- course access: 2 sandbox, 0 live;
- purchase confirmations: 1 sandbox, 0 live;
- live email outbox: 0;
- sandbox retry queue: 1.

The performance and health advisors returned no findings. The security advisor still reports Leaked Password Protection disabled. Its five RLS-without-policy findings concern service-only tables; RLS is enabled, and the inspected privileged RPCs have an empty search path and execute permission restricted to `service_role`.

## Limits and remaining blockers
These tests validate installed database fulfilment logic and rollback behavior. They do not test Stripe signature verification, an actual Stripe HTTP delivery, simultaneous two-connection locking, Resend delivery, production secret values, or the proposed webhook candidate. Those remain separate release gates. No deployment is approved by this report.

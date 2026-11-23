# Tasks 83–99 — technical verification and deployment gates
Date: 2026-11-13 UTC
Scope: read-only verification; preserve all production and sandbox data, subscriptions, cancellation, entitlements, homepage and Supabase Free plan.

## Evidence
Supabase Edge Function inventory obtained via list_edge_functions. PR #5 verified draft. Source of eight deployed functions inspected via get_edge_function. Task 69/72 CI job 131621341732 passed six assertion groups in isolated PostgreSQL; Task 70 actual-source mocked webhook workflow passed. This is NOT installed-production two-connection proof.

## Individual task status
| Task | Check | Result |
| --- | --- | --- |
| 83 | Historical sandbox email reconciliation procedure | PREPARED: hold ambiguous historical session, correlate Resend provider message ID/status before editing or resending; see Tasks 81–82. Provider history unavailable. |
| 84 | Sandbox deployment checklist | PREPARED: verify source vs installed RPC, all CI logs, fail-closed flags, provider reconciliation, rollback/version backup, no production changes. Gate NOT cleared. |
| 85 | Inventory deployed Edge Functions | VERIFIED: 13 active functions; see inventory below. |
| 86 | Verify sandbox webhook deployment version | VERIFIED: stripe-test-webhook v25; Task 67 candidate not deployed. |
| 87 | Verify production Stripe webhook presence | VERIFIED: stripe-webhook v31 ACTIVE, verify_jwt false; source uses Stripe signature verification. No live event delivery exercised. |
| 88 | Verify live checkout authentication path | VERIFIED IN SOURCE: stripe-live-checkout v12 calls supabase.auth.getUser and reads STRIPE_LIVE_CHECKOUT_ENABLED; flag value and end-to-end checkout not verified. |
| 89 | Verify sandbox membership webhook controls | VERIFIED IN SOURCE: membership-test-webhook v9 references MEMBERSHIP_TEST_FULFILMENT_ENABLED and validates Stripe signature. No new events sent. |
| 90 | Verify membership portal access gate | VERIFIED IN SOURCE: membership-test-portal v5 uses auth.getUser and MEMBERSHIP_TEST_PORTAL_ENABLED; no portal session created. |
| 91 | Verify protected lesson auth gate | VERIFIED IN SOURCE: paid-lesson-content v16 verify_jwt=true and calls auth.getUser; paid entitlement enforcement requires further test. |
| 92 | Verify purchase confirmation identity gate | VERIFIED IN SOURCE: my-purchase-confirmations v11 calls auth.getUser; data isolation requires authenticated tests. |
| 93 | Verify live email worker disabled-by-default path | VERIFIED IN SOURCE: live-purchase-email-delivery-worker v1 checks LIVE_PURCHASE_EMAIL_WORKER_ENABLED, returns no-op when disabled, separately references LIVE_PURCHASE_EMAIL_SENDING_ENABLED. Actual secret values not read; no worker invoked. |
| 94 | Verify live email audit dry-run path | VERIFIED IN SOURCE: live-purchase-email-retry-audit v1 declares dry-run mode, no send or claim; not invoked. |
| 95 | Verify sandbox retry worker dry-run path | VERIFIED IN SOURCE: purchase-email-retry-worker v10 reports sending_enabled:false, claiming_enabled:false, scheduler_enabled:false. |
| 96 | Verify other sandbox endpoint inventory | VERIFIED: stripe-test-checkout v24, membership-test-checkout v10, paid-course-media-link v1 ACTIVE. Not exercised. |
| 97 | Check production and sandbox Stripe subscriptions | VERIFIED PREVIOUS READ: zero live subscriptions, one active sandbox subscription cancel_at_period_end=true; no changes. |
| 98 | Check email provider delivery evidence | BLOCKED: sandbox queue accepted attempts=0 provider_message_id NULL, receipt sent timestamp later; no Resend provider history available. Do not infer delivery. |
| 99 | Final release readiness decision | HOLD: PR #5 remains draft, unmerged. No revised sandbox webhook deployment. Outstanding provider reconciliation and real end-to-end account/fulfilment tests. |

## Deployed inventory
- stripe-webhook v31 ACTIVE
- stripe-test-checkout v24 ACTIVE
- stripe-test-webhook v25 ACTIVE
- paid-lesson-content v16 ACTIVE, verify_jwt true
- stripe-live-checkout v12 ACTIVE
- my-purchase-confirmations v11 ACTIVE
- purchase-email-retry-worker v10 ACTIVE
- membership-test-checkout v10 ACTIVE
- membership-test-webhook v9 ACTIVE
- membership-test-portal v5 ACTIVE
- paid-course-media-link v1 ACTIVE, verify_jwt true
- live-purchase-email-retry-audit v1 ACTIVE
- live-purchase-email-delivery-worker v1 ACTIVE

## Deployment checklist
- [x] Isolated PostgreSQL concurrency, lease, backoff, retry and synthetic entitlement tests pass (GitHub Actions job 131621341732).
- [x] Mocked webhook actual-source regression test passes.
- [x] Preserve draft PR #5 and production configuration.
- [ ] Correlate historical Resend provider event and message ID; prevent duplicate resend.
- [ ] Verify current candidate against exact installed RPC signatures, security policies and grant permissions.
- [ ] Verify webhook secrets and feature flag values without exposing them.
- [ ] Verify rollback artifact and exact currently deployed version.
- [ ] Verify actual sandbox webhook event and provider acknowledgement under controlled authorization.
- [ ] Verify login, registration, password recovery, paid/unpaid lesson isolation and membership lifecycle.
- [ ] Approve release only when required checks pass.

No payments, Checkout Sessions, emails, webhook invocations, deployments or database mutations performed in Tasks 83–99. Status VERIFIED IN SOURCE is not end-to-end verified.

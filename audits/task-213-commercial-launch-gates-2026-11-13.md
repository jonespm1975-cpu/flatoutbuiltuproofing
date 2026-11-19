# Commercial launch gate — 13 November 2026
Status: HOLD. These files are staged on a feature branch only, not deployed.

## Verified in connected Supabase
- Live stripe-webhook v31 still directly sends Resend email and may return 503 after entitlement creation.
- Live stripe-live-checkout v12 does not include terms_version in Stripe metadata.
- public.fulfil_live_course_purchase_v4 installed, executable by service_role only, not anon/authenticated.
- Rollback-only sequential duplicate purchase simulation passed; one receipt, one pending outbox item, no persistent test data.
- Live outbox trigger enqueues pending cs_live_% receipts and ON CONFLICT DO NOTHING.
- Security advisor reports leaked-password protection disabled.
## Prepared in this branch
- Staged checkout adds APPROVED_TERMS_VERSION guard and metadata. NOT DEPLOYED.
- Static contract test source checks proposed webhook and checkout consistency. Tests require running in CI/local Node; no claim of execution.
## Must pass before release
1. Owner/legal review and approval of draft terms, refunds, privacy and digital-content consent, including compatibility/accessibility and durable confirmation.
2. Checkout UI collects unticked, distinct consents; records approved terms version, consent timestamp, user and course.
3. Run static contract tests and signed sandbox webhook tests for correct, duplicate, malformed, delayed and invalid signatures.
4. Two-connection concurrency and rollback tests; reconcile existing entitlements and subscription cancellation.
5. Confirm live Stripe keys, webhook endpoint, signing secret, price and delivery status without real charge.
6. Verify Resend delivery worker, retry, idempotency and no double email.
7. Coordinate controlled deploy and rollback plan; only enable live flags after passing checks and explicit owner approval.
## Preservation
No live payment activation, email send, subscription alteration, homepage change or Free-plan upgrade authorized by this branch.

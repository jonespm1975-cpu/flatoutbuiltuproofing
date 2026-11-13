# Critical payment release: schema and trigger verification
Date: 2026-11-13
Scope: read-only Supabase inspection and rollback-only purchase-flow tests. No customer operations.

## Verified schema and trigger behavior
- `purchase_confirmations.terms_version` is NOT NULL with default `2026-11-11`; relying on the default is not evidence that a customer consented to that exact terms text.
- `enqueue_live_purchase_confirmation_email_on_receipt` runs AFTER INSERT OR UPDATE OF email status and calls `internal.enqueue_live_purchase_confirmation_email()`.
- `trg_enqueue_sandbox_purchase_confirmation` runs AFTER INSERT and calls `internal.enqueue_sandbox_purchase_confirmation()`.
- Live enqueues only `cs_live_%` receipts in pending state into the internal live outbox. Sandbox enqueues only `sandbox-test` / `cs_test_%` pending receipts into the public sandbox queue. Both enqueue functions use SECURITY DEFINER and an empty search_path.
- The duplicate-sender risk is the direct Resend POST in live webhook v31 plus the separately gated worker; two queue triggers do not create two external email sends by themselves.

## Corrections from Tasks 274–283
- `public.fulfil_live_course_purchase_v4` **is installed**. Its verified signature accepts session, user, course, amount, currency, consent timestamp, and terms version. It has an empty search_path, is SECURITY INVOKER, and execute permission is restricted to `service_role`.
- Rollback-only integration verified fulfilment, duplicate idempotency, pending receipt/outbox creation, preservation of any existing entitlement, and removal of synthetic test rows after rollback.
- The candidate webhook v32 remains staged and undeployed. The offline contract tests passed, but they do not replace signed HTTP tests or true database concurrency tests.
- The current synthetic test suite did not change the data baseline: 2 sandbox access rows, 1 sandbox receipt, 0 live outbox rows, and 1 sandbox retry row.

## Release blockers
1. Genuine simultaneous two-connection testing of the installed live email claim/lease functions remains unproven.
2. Live webhook v31 still sends directly through Resend and can return 503 after access has already been granted. The separate email worker is gated; its live secret values were not inspected.
3. Legal pages/terms version and checkout consent UI require final owner/legal review before deployment.
4. Supabase security advisor still reports Leaked Password Protection disabled. Enable it if the setting is available, then recheck.
5. Historical Stripe records require reconciliation without automatic backfill. The £11.99 test total is explained by tax-exclusive vs tax-inclusive test configuration, but 2 access records lack receipts and 1 receipt lacks access.
6. Event `evt_1Ub6xTKS41qhUQTKCAsjwHU2` is a TEST subscription checkout with `pending_webhooks=1`; the matching membership row is active and set to cancel at period end. No replay was made; verify the correct destination in Stripe Workbench before any retry.
7. Resend provider delivery is not independently verified; Supabase's `sent` state does not prove provider delivery or inbox receipt.
8. No production activation was performed in these checks. Keep any coordinated live change held until release gates close and the current explicit authorization is confirmed.

No production resources were changed. Do not mark the release gates complete until the outstanding checks above are verified.

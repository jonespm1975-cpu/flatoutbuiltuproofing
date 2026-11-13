# Task 219 — Isolated email retry test — 2026-11-13
Scope: Supabase installed production functions, rollback-only simulation. No Stripe payment, no Resend call, no production deploy.

## Executed
Within a PL/pgSQL nested exception subtransaction:
1. Called public.fulfil_live_course_purchase_v4 for synthetic cs_live_isolated_rollback_20261113_219 and an existing user.
2. Asserted exactly one internal.live_purchase_email_outbox entry.
3. Claimed the job with public.claim_live_purchase_email_retry(1).
4. Asserted invalid random token cannot finalize accepted delivery.
5. Finalized a simulated failure with valid claim token, expecting true.
6. Asserted the consumed claim token cannot subsequently finalize accepted delivery.
7. Raised intentional ROLLBACK_ISOLATED_TEST exception, caught only that sentinel; all other errors would abort the SQL.
8. Independently queried persistent state: outbox_rows=0, receipt_rows=0, access_rows=0.

## Result
PASS: SQL completed without unexpected exception and independent cleanup verification returned three zero counts.

## Limitations
This is a sequential single-connection transaction test, NOT a two-connection race test, signed Stripe event test or Resend delivery confirmation. The synthetic terms version was used only inside the rolled-back subtransaction. No claims about customer inbox delivery.

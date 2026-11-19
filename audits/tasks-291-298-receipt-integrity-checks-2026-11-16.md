# Tasks 291–298 — Fresh read-only payment/receipt integrity tests — 2026-11-16

Project: Supabase fhyhshakmvqwzdyannec. Branch: launch-checkout-terms-alignment-20261113. Stripe account: TEST acct_1UaPRuKS41qhUQTK.

Executed eight new, read-only SQL integrity assertions (not repeated from 282–290):

291. NULL session IDs in course_access: 0 — PASS.
292. NULL session IDs in purchase_confirmations: 0 — PASS.
293. Duplicate checkout-session IDs in course_access: 0 — PASS.
294. Duplicate checkout-session IDs in purchase_confirmations: 0 — PASS.
295. Nonpositive paid_amount_pence in purchase_confirmations: 0 — PASS.
296. Non-GBP purchase_confirmations: 0 — PASS.
297. 'sent' purchase_confirmations with NULL confirmation_email_sent_at: 0 — PASS.
298. 'pending' purchase_confirmations with non-NULL confirmation_email_sent_at: 0 — PASS.

Current read-only baseline cross-check: course_access=2, purchase_confirmations=2, access without receipt=1, receipt without access=1, live outbox=0, pending email=1, failed email=0, live receipts=0, live access=0. No baseline changes since tasks 282–290.

Stripe TEST event evt_1Ub6xTKS41qhUQTKCAsjwHU2: checkout.session.completed, subscription, livemode=false, pending_webhooks=0 (unchanged). This is not proof of a successful HTTP response to stripe-test-webhook. No delivery retry.

Checked function_edge_logs for stripe-test-webhook on 2026-11-15 UTC; no matching messages. Does not prove no delivery, only no matching accessible log entries in that interval.

Blockers remain: true overlapping two-connection PostgreSQL concurrency test unavailable through serialized SQL connector; Stripe event destination/HTTP response not independently verified; Resend provider delivery inaccessible; two historical sandbox receipt/access mismatches unresolved. Do not backfill or send.

No email, charge, checkout, webhook replay, production deployment, subscription/entitlement modification, homepage change or Supabase plan change.

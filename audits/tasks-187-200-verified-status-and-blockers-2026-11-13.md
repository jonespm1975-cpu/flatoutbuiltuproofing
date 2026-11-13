# Tasks 187–200 — execution status and release blockers
Date: 2026-11-13
Scope: Supabase and GitHub read-only verification; no live writes, charges, emails or deployments.

## Verified findings
- Supabase list_branches returned []: no isolated development branch currently exists. No local psql/postgres/docker executable detected. Genuine two-connection DB tests NOT executed.
- Deployed Edge Functions include stripe-webhook v31, stripe-live-checkout v12, live-purchase-email-delivery-worker v1, membership-test-checkout v10, membership-test-webhook v9, membership-test-portal v5, paid-lesson-content v16, paid-course-media-link v1.
- Live webhook checks Stripe signature, paid status, livemode, GBP 999, allowlisted price, authenticated customer and consent metadata. It writes course_access and purchase_confirmations in separate REST requests and directly calls Resend. An email failure after grant returns HTTP 503; duplicate event delivery may then reattempt sending. This is a release blocker.
- Live email worker has two operator flags, requires service-role bearer, uses claim/finish RPCs, and calls Resend separately. Do not enable while webhook is direct sender. Flag values not verified.
- stripe-live-checkout validates authenticated customer and 3 consent booleans and creates Stripe Checkout sessions if enabled. Do not invoke it during verification.
- GitHub purchase-info.html still displays disabled immediate-delivery checkbox and disabled checkout button, with 'Checkout not available yet'. The customer-facing path needs coherent implementation and tested legal wording.
- terms.html, refunds.html, privacy.html still identify themselves as DRAFT. Privacy notice contains unresolved retention, marketing and children/security placeholders. Do not remove draft warnings without confirmed policies and legal review.
- Live outbox, live receipts and live course grants were all 0 in the read-only count query in the preceding audit.
- Security advisor warns leaked-password protection disabled; cannot claim enabled.

## Task status
187 Finalise fulfilment SQL: review draft exists, requires corrected v4, owner/permission tests, and signed Stripe validation in webhook; NOT deployed.
188 Isolated test DB: BLOCKED by absent disposable DB/branch and no verified free provisioning path.
189 Two-connection concurrency: BLOCKED by 188; not run.
190 Single sender: architecture reviewed; NOT implemented/deployed; current duplicate-sender risk remains.
191 Email retry tests: SQL/code reviewed only; no actual provider send or concurrent test.
192 Historical Stripe 422: no matching event payloads or Stripe delivery logs independently reconciled in this batch.
193 Resend: provider-side delivery NOT independently confirmed.
194 Leaked-password protection: security advisor confirms disabled; not changed.
195 Auth account tests: RLS and RPC access checked; interactive registration/login/recovery tests not run.
196 £9.99 checkout: static Edge Function review; end-to-end test not run, no sessions created.
197 £1.99 membership: functions deployed; renewal/cancellation/expiry scenarios not run.
198 Legal: reviewed four pages; draft warnings and placeholders remain, not ready for launch.
199 Emails: live webhook/worker code reviewed; delivery not verified; single-sender blocker.
200 Interior pages: purchase-info.html reviewed; wider visual QA and learning media review not complete.

## Critical next actions
1. Produce revised fulfilment migration and webhook/worker patch in source control for review, preserving homepage, billing, subscription and entitlements.
2. Establish a truly isolated PostgreSQL environment at no unapproved cost; run two-connection concurrency, role grants, receipt/trigger and rollback tests.
3. Review and resolve legal operational placeholders and implement actual consent interface.
4. Reconcile historical Stripe 422 events and Resend acceptance/delivery using provider logs before any live enablement.
5. Enable leaked-password protection after validating availability and impact.
6. Require explicit go-live approval for any billing/email production activation.

No task above is claimed complete beyond the read-only reviews explicitly identified.

# Flat Out Built-Up Roofing — verified handover and remaining work

Date: 2026-11-13 (UTC date; exact audit execution time not recorded)
Scope: read-only reconciliation of Supabase, inspection of deployed email worker and RPC definitions, and owner-confirmed Resend delivery. No customer emails, payments, checkout sessions, database writes or deployments performed.

## Verified
- Owner reports Resend Delivered for sandbox course confirmation on 2026-11-12 ~22:28 UTC; direct provider log not accessible to connector.
- One purchase confirmation marked sent, same user/course entitlement exists.
- Sandbox retry queue: one accepted, zero pending/leased retryable jobs; zero attempts, no active lease.
- Deployed purchase-email-retry-worker v10 is a dry-run inspector with no sending/claiming/scheduling.
- Sandbox claim RPC requires pending confirmation, sandbox session and sandbox terms; accepted jobs excluded. Anon/authenticated lack EXECUTE.
- Deployed live-purchase-email-delivery-worker v1 requires service-role bearer auth and both LIVE_PURCHASE_EMAIL_WORKER_ENABLED=true and LIVE_PURCHASE_EMAIL_SENDING_ENABLED=true before processing. Current environment flag values were NOT independently read.
- Live claim RPC restricts cs_live_ sessions, pending receipts, GBP 999p, non-sandbox terms, max five attempts, SKIP LOCKED leases. Finish RPC requires matching unexpired lease token and nonempty provider ID for success. Anon/authenticated lack EXECUTE.
- Live worker sends Resend Idempotency-Key course-confirmation-<session>; provider acceptance is not proof of delivery.
- At latest read-only check: live outbox=0, live course_access cs_live_ grants=0, sandbox accepted=1, sandbox pending/leased=0, sent confirmations=1.

## Important remaining work (NOT verified complete)
1. Confirm actual values of live email worker/sending flags via authorised secure configuration inspection; keep them disabled until explicitly approved.
2. Review Resend idempotency retention and failure-after-provider-acceptance scenario. Ensure reclaims cannot create duplicate emails after provider acceptance, including after provider idempotency expiry. Design and test without sending real emails.
3. Verify whether live stripe-webhook v31 still sends confirmation directly, and whether this can race with the live outbox worker. Do not change live fulfilment without isolated tests and approval.
4. Investigate historical sandbox webhook 422 attempts with event-ID-level delivery evidence; do not infer causes from timestamps alone.
5. Run isolated two-connection sandbox concurrency tests for email claims and course access; do not modify existing customer records.
6. Verify current live Stripe £9.99 checkout and £1.99 membership product configuration, legal consent, cancellation, VAT/tax display and live-versus-test gating without creating payments.
7. Verify legal pages and checkout consent against UK consumer requirements, including immediate digital supply consent and applicable cancellation consequences; legal review recommended.
8. Verify Resend production sender configuration and receipt delivery with a controlled authorised test before enabling customer mail.
9. Review Supabase Auth leaked-password protection, RLS, secrets exposure, and course-media authorisation; preserve Supabase Free plan.
10. Audit website mobile layout, accessibility, internal links, imagery, learning content, and deployment status while preserving the approved homepage.
11. Review launch readiness and obtain explicit approval before any live billing, email sending, or production-impacting deployment.

## Operational restrictions
Preserve existing entitlements, subscriptions and cancellations, approved homepage, live billing state, and Supabase Free plan. No lead generation. Do not create charges, send emails, replay webhooks, or deploy production changes during evidence gathering.

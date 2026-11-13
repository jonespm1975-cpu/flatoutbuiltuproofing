# Tasks 269–273 — Verification and remaining blockers — 2026-11-13

Scope: preserve live billing, existing subscriptions, entitlements, homepage, and Supabase Free plan. No payments, emails, replay or production deployment.

## 269 — Genuine concurrency
BLOCKED: The connected Supabase execute_sql requests serialize. Independent two-connection harness staged at tests/two-connection-advisory-lock-probe.mjs but not executed with direct PostgreSQL credentials. It proves advisory lock exclusion only, not SKIP LOCKED claim contention. No passing concurrency claim.

## 270 — Email queue integrity
PARTIAL PASS: Inspected actual installed SQL definitions of claim_live_purchase_email_retry and finish_live_purchase_email_retry. Claim uses FOR UPDATE OF q SKIP LOCKED, five-minute lease, unique random token, max 5 attempts, live session prefix, valid receipt, GBP 999 and non-sandbox terms. Finish checks session, token, active lease, receipt and provider message ID. Executed four non-destructive tests: claim(limit=0) returned zero; finish sandbox session returned false; finish live session with missing provider ID returned false; finish with invalid token returned false. True simultaneous duplicate claims and lease expiration under contention remain untested.

## 271 — Historical membership event
OPEN: Stripe TEST evt_1Ub6xTKS41qhUQTKCAsjwHU2 still pending_webhooks=1. No retry delivery action available through connected Stripe API. Current deployed course sandbox handler v25 ignores subscription checkouts with HTTP 200. Retry only existing event to stripe-test-webhook using Stripe Workbench, then verify HTTP 200, pending delivery cleared and no course unlock. No replay executed.

## 272 — Historical three-session discrepancy
PARTIALLY RECONCILED: Stripe verifies two sandbox course_access sessions paid (GBP 1199 and 999) with matching course/user/consents but missing receipts. Third sandbox receipt corresponds to paid GBP 999 session with matching course/user/consents but no course_access. Third receipt terms_version=sandbox-test and recorded email status sent. Preserve all records pending historical-flow review; do not backfill a sandbox-only test automatically. GBP 1199 session differs from nominal course price and warrants historical tax/price review.

## 273 — Resend delivery
OPEN: Supabase purchase_confirmations shows confirmation_email_status=sent, confirmation_email_sent_at=2026-11-12 22:28:36.658 UTC, error null; webhook HTTP 200 at 22:28:37.008 UTC. No connected Resend provider logs API; provider delivery cannot be independently verified. Plugin directory search did not identify Resend integration. User previously reported Resend Delivered, but direct provider check remains outstanding.

Conclusion: No unsafe changes made. 270 safety guards pass four negative tests; remaining tasks cannot be certified complete without appropriate direct connections/provider evidence.

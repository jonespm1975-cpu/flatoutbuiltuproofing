# Next priority — 2026-11-13 webhook HTTP 400/422 triage
Read-only log inspection, no event replay or secrets changed.

## Exact observed requests
12 Nov 2026 UTC:
- 22:59:08.383 membership-test-webhook HTTP 400 (two log entries at same timestamp)
- 22:59:08.483 stripe-test-webhook HTTP 422
- 22:59:22.696 membership-test-webhook HTTP 400
- 22:59:23.011 stripe-test-webhook HTTP 422
- 22:59:24.712 membership-test-webhook HTTP 400

## Deployed code (not staged candidate)
stripe-test-webhook v25: HTTP 422 for invalid/missing customer UUID, checkout mode/currency/amount/consent/metadata mismatch, wrong line-item price/quantity, or unknown user. Need exact Stripe event IDs and response bodies to discriminate.

membership-test-webhook v9: HTTP 400 for invalid Stripe signature, or live-mode event prohibited. Missing signature or secret instead returns 503. Need Stripe event IDs and signing-key endpoint mapping to distinguish.

## Next safe actions
1. Read Stripe test Workbench delivery history at those timestamps and match endpoint URL, event ID, event type, response body; avoid copying signing secrets.
2. Compare Stripe event data (test/live mode, session mode, metadata, line items, price, customer reference) against v25 validation.
3. Check whether membership events were routed to course endpoint and vice versa.
4. Only propose source changes for verified mismatches; never relax signature, customer, price or consent checks.
5. Re-run isolated tests and mocked actual-source tests after changes; do not deploy or replay until approved gates pass.

## Other priorities
Resend historical status remains unverified at provider. Supabase Auth leaked-password protection warning remains. No account credentials or safe E2E test session provided. Preserve production, subscriptions, entitlements, homepage, Free plan, draft PR #5.

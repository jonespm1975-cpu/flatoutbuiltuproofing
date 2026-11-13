# Priority verification: Resend, Auth, sandbox fulfilment — 2026-11-13 UTC

## 1. Resend reconciliation
Supabase historical logs for 2026-11-12 22:28 UTC show:
- 22:28:35.906 POST /rest/v1/purchase_confirmations?on_conflict=stripe_checkout_session_id HTTP 201
- 22:28:36.241 GET /rest/v1/purchase_confirmations?select=confirmation_email_status... HTTP 200
- 22:28:36.664 PATCH /rest/v1/purchase_confirmations?... HTTP 204
- 22:28:37.008 POST /functions/v1/stripe-test-webhook HTTP 200
Historical confirmation sent_at=22:28:36.658, queue accepted attempts=0 provider_message_id null updated 16:12:25.
Deployed webhook v25 sends directly via Resend and updates purchase_confirmations separately. The PATCH confirms a DB status update, NOT actual Resend delivery. Provider read-only event/message lookup still required. No resend.

## 2. Leaked-password protection
Supabase security advisor WARN: auth_leaked_password_protection disabled. No connected Auth settings write action exists; not changed. Review https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection and enable in Supabase Auth dashboard if plan supports it. Re-run advisor after enabling.

## 3. Account testing
auth.identities contains 2 records (aggregate only; no personal data retrieved). Existing course_access 2 sandbox records. RLS enabled on course_access and membership_subscriptions, with authenticated SELECT user_id=auth.uid(). Anonymous access not granted to email claim/finish RPCs. No credentials or test accounts available for login/registration/password recovery, so no end-to-end authentication attempts made.

## 4. Sandbox fulfilment
Isolated PostgreSQL two-client test and mocked actual-source webhook pass. Supabase function_edge_logs at 22:28:37 show stripe-test-webhook HTTP 200, but this alone cannot prove email delivery or entitlement fulfilment for all cases. At 22:59 three sandbox course webhook HTTP 422 and multiple membership webhook HTTP 400 events appear; must correlate event IDs/signatures to classify before remediation. Do not replay events without explicit safe selection and flags. No Stripe payments or sessions created.

## Release decision
HOLD. PR #5 draft and unmerged, deployed sandbox webhook v25 unchanged. Preserve subscription cancellation, course entitlements, live billing, homepage and Supabase Free plan. No emails sent, no DB writes, no production deployment.

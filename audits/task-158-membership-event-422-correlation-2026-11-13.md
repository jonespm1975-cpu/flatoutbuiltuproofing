# Task 158 — Stripe 422 root-cause analysis, 2026-11-13 UTC

## Strong new correlation
Read Stripe sandbox event evt_1Ub6xTKS41qhUQTKCAsjwHU2 directly through Stripe's authenticated API. It was created 2026-11-12 22:59:07 UTC, type checkout.session.completed, livemode=false, session mode=subscription, payment_status=paid, amount_subtotal=199, amount_total=199, with metadata keys membership, mode, supabase_user_id; course_id and course-consent metadata absent. This is the £1.99 monthly membership flow, not the £9.99 one-time course.

Supabase historical HTTP 422 calls to course endpoint: 22:59:08.483 UTC (deployment v20), 22:59:23.011 UTC (v20), 23:58:20.354 UTC (v23), all with content-length 4325. First failure occurs ~1–2 seconds after subscription event creation; the later two are consistent with Stripe delivery retries but cannot be proven without Stripe delivery attempt details. Same byte length alone does not establish event identity.

## Validation comparison
Current deployed stripe-test-webhook v25 verifies Stripe signature, then checks livemode and *before course mapping/price/consent checks* returns HTTP 200 for session.mode='subscription'. The retrieved subscription event would be ignored safely by v25. If historical v20/v23 lacked that guard, they would fail course-specific checks: subtotal 199 vs required 999, missing course_id, missing immediate_access_consent, cancellation_acknowledgement, terms_accepted and consent_recorded_at; 422 is the expected rejection class. This is a highly plausible root cause, NOT yet a confirmed exact event-to-delivery match. The historical v20/v23 source code was not retrieved and should not be assumed to be identical to v25.

## Resolution status
The current v25 guard is already deployed. No new deployment is justified or made. Membership webhook remains separately configured for subscription/invoice events. The current safeguard is confirmed in deployed source, but has not been exercised against a genuine signed Stripe event after deployment; no replay or payment was made. No course entitlement should be granted for subscription checkout. Read-only log search for Nov 13 course webhook calls returned no rows, so there is no post-fix live-request evidence.

## Remaining verification
Retrieve Stripe Workbench attempt details for the three 422s to confirm event ID, request body and response body; review v20/v23 source via retained deployment snapshots if available. Independently verify Resend and genuine isolated database concurrency separately. Never replay old events without explicit authorization.

## Safety
No charges, emails, webhook replays, database writes, live settings, subscriptions, entitlements, homepage, or Supabase plan changes.

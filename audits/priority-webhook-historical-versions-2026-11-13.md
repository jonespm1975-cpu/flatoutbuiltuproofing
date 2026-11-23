# Priority payment/email blocker investigation — 2026-11-13
Read-only Stripe/Supabase inspection; no replay, emails or payments.

## New forensic evidence from function_edge_logs and function_logs
At 2026-11-12T22:59 UTC, Supabase edge logs show Stripe/1.0 user-agent on failed webhook POSTs. Historical deployed versions were **membership-test-webhook v5** for HTTP 400 and **stripe-test-webhook v20** for HTTP 422, NOT today's installed membership v9 and course v25. Function logs independently show v5 and v20 boot events. Therefore current deployed code's return branches cannot establish historical root cause. Avoid attributing v20 HTTP 422 to v25 validation branches or v5 HTTP 400 to v9 signature branches.
- Membership 400 requests at 22:59:08.383 twice (content lengths 6244 and 6237), 22:59:22.696 (6237), 22:59:24.712 (6244); deployment version 5.
- Course 422 requests at 22:59:08.483 and 22:59:23.011 (content length 4325); deployment version 20.
- Source event IDs not included in Supabase logs. User-agent Stripe/1.0 indicates Stripe client but not cryptographic proof of event identity.
- Current Stripe API read connector lists events and endpoints but does not expose delivery-attempt response bodies. Must obtain historical version 5/20 source and delivery response text before exact diagnosis.
- Existing Stripe sandbox subscription and Supabase record match, active and cancel_at_period_end=true; this is not proof every webhook succeeded.
- Historical Resend confirmation: receipt 'sent' but queue 'accepted' attempts=0 provider_message_id NULL. No provider delivery proof. Worker remains dry-run.

## Safe next steps
1. In Stripe sandbox Workbench inspect event delivery response bodies and IDs at 22:59, not simply event creation timestamps. Save redacted response text.
2. Retrieve immutable historical v5/v20 function source or GitHub commit corresponding to deployments, if accessible. Do not substitute v9/v25.
3. In Resend email activity inspect 22:28 12 Nov message, acceptance/delivery status and provider ID; never resend ambiguous historical receipt.
4. Re-run existing isolated tests only after verifying candidate code and feature flags. No production deployment until signed-event, email provider and account-access gates pass.

Preserve all live billing, subscription cancellation, entitlements, homepage, Supabase Free plan. No mutations, emails or payments.

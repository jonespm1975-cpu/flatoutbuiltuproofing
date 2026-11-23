# Failed Stripe delivery-to-version correlation and Resend evidence boundary — 2026-11-13
## Verified via read-only Supabase function_edge_logs
Historical 12 November 2026 UTC:
- 22:59:08.383 membership-test-webhook HTTP 400, deployment v5, request IDs 01a1d1fc-7e20-7cca-9d1e-a8dc0fd1dc70 and 01a1d1fc-7eeb-7d9d-9ddd-c731b0980326.
- 22:59:08.483 stripe-test-webhook HTTP 422, deployment v20, request ID 01a1d1fc-7de0-78ed-b0c2-fbe4b52c2cc6.
- 22:59:22.696 membership-test-webhook HTTP 400, deployment v5, request ID 01a1d1fc-b748-72eb-9900-09cfeb0c0fd6.
- 22:59:23.011 stripe-test-webhook HTTP 422, deployment v20, request ID 01a1d1fc-b816-7322-955b-bd142a5a14e8.
- 22:59:24.712 membership-test-webhook HTTP 400, deployment v5, request ID 01a1d1fc-bf1d-7bf9-ab64-2de25009d216.
- All have Stripe/1.0 user-agent; log attributes show response HTTP status and historical deployed version, but no Stripe event ID or HTTP response body. Thus cannot assign exact event or rejection reason from logs alone.
- GitHub historical webhook-related commit search returned commits but not immutable Supabase deployment source for v5/v20; current v9/v25 logic cannot substitute for historical logic.
## Resend
- No connected Resend API/tool available, and plugin search did not yield a Resend provider connector. Cannot access Resend email activity directly.
- purchase_confirmations status='sent' at 2026-11-12 22:28:36.658 UTC; sandbox_email_retry_queue status='accepted', attempts=0, provider_message_id NULL. No provider acceptance/delivery evidence.
- To finish, obtain read-only Stripe Workbench delivery response bodies/event IDs for the listed timestamps and Resend email activity record at 22:28 UTC with message ID/status. Redact recipient addresses and secrets.
## Safety
No email sent or resent, no payment or Checkout Session, no webhook replay or deployment, no changes to live billing, existing subscriptions/cancellation, entitlements, homepage or Supabase Free plan.

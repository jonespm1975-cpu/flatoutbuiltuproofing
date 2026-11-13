# Task 190 — single-sender release patch (REVIEW ONLY)
Date: 2026-11-13
Current production: stripe-webhook v31 performs course grant, receipt insert and direct Resend POST. live-purchase-email-delivery-worker v1 also contains a Resend POST and is gated by two flags. Neither function changed by this file.

## Required atomic cutover
1. In a disposable database, install and validate Task 187 fulfil_live_course_purchase_v4 and outbox trigger. Confirm exact allowed course id and schema constraints.
2. In a replacement webhook, retain signature verification, paid/livemode checks, exact GBP 999 price, quantity=1, customer identity and all three consent checks. Require and validate terms_version (the current checkout does NOT send it).
3. Replace the two separate REST writes with one RPC call to public.fulfil_live_course_purchase_v4 after validation. The RPC is service_role only. Never trust client-provided payment amounts or user IDs.
4. Delete all Resend API calls and email-status updates from the webhook. Once atomic fulfilment succeeds, return 200 even if mail is pending. On RPC failure return retryable 503; never claim success if no receipt was recorded.
5. The receipt INSERT trigger enqueues exactly one outbox row per session. The worker is the only component permitted to POST to Resend. Keep LIVE_PURCHASE_EMAIL_WORKER_ENABLED=false and LIVE_PURCHASE_EMAIL_SENDING_ENABLED=false during cutover and verification.
6. Reconcile any legacy receipts with confirmation_email_status='sent' against outbox; never resend them. Check provider idempotency keys and lease finalization before enabling.
7. Verify worker claims, expired leases, rejected provider responses, duplicate invocations and idempotency under independent database sessions. A provider acceptance is not proof of delivery.
8. After verification and owner go-live approval, enable one controlled worker path, monitor outbox/provider statuses and keep a rollback plan. Avoid a period where both webhook and worker send.

## Existing code mismatch to correct
- stripe-live-checkout v12 metadata contains immediate_access_consent, cancellation_acknowledgement, terms_accepted and consent_recorded_at, but no terms_version. Task 187 v4 requires nonempty p_terms; the new webhook cannot safely populate an invented terms version.
- stripe-webhook v31 does not persist terms_version and sends email inline. Its email response HTTP 503 may retry an already-granted order.
- worker v1 requires receipt.terms_version != 'sandbox-test', amount=999, currency=gbp and course_id='beginner-training-course'. Confirm configured course ID matches and make a shared canonical allowlist.

## Acceptance gates
- Atomic transaction passes genuine concurrent rollback/idempotency tests.
- Live checkout and webhook agree on signed terms_version and course ID.
- Webhook source contains no api.resend.com/emails and no RESEND_API_KEY.
- Exactly one provider-send path exists and worker remains disabled until authorised.
- Existing subscriptions, entitlements, homepage and Supabase Free plan unchanged.

Status: SOURCE CHANGE SPECIFICATION ONLY. Not deployed. No emails or payments sent.

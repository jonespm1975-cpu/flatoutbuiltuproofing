# Task 148 — Safe webhook diagnostics specification
Date: 2026-11-13 (UTC). Status: design-only; not deployed.

## Objective
Distinguish Stripe sandbox webhook rejections without logging sensitive event payloads, customer identifiers, signatures, secrets, or email addresses. Preserve historical event interpretation: new instrumentation cannot retroactively identify the exact cause of the three 2026-11-12 HTTP 422 responses.

## Proposed implementation (future review and sandbox test required)
1. After successful Stripe signature verification, log a structured event with only endpoint, deployment version, Stripe event type, HTTP status and stable rejection code. Avoid raw event IDs unless separately approved for a restricted audit sink; if correlation is essential use a one-way HMAC with an audit-only secret, not a plain hash.
2. Course webhook rejection codes: CUSTOMER_MAPPING_MISSING; CHECKOUT_FIELDS_MISMATCH; PRICE_LINE_ITEM_MISMATCH; UNKNOWN_CUSTOMER; SIGNATURE_INVALID; CONFIGURATION_MISSING; FULFILMENT_RETRY. Membership webhook codes: SIGNATURE_INVALID; LIVE_EVENT_PROHIBITED; SUBSCRIPTION_PRICE_MISMATCH; USER_MAPPING_INVALID; CUSTOMER_MISSING; UNKNOWN_USER; INVOICE_MODE_MISMATCH; SYNC_RETRY. Preserve existing HTTP statuses and response bodies initially; logs must not reveal secret values.
3. Add unit tests for subscription events routed to course endpoint (200 ignored), invalid signature (400), absent user mapping (422), mismatched consent/price (422), and transient backend errors (503). Verify logging redaction and idempotency. No Stripe events or Resend sends required for tests; use offline signed fixtures and mock providers.
4. Before deployment, compare against live deployed source, run static checks, test in isolated sandbox, and obtain explicit approval for any change that could affect webhook handling. Do not enable flags or schedules.
5. For historical 422s, inspect Stripe Workbench delivery detail (event ID, destination, delivery timestamp, HTTP response body) and historical Supabase deployment code at that time. Do not replay deliveries solely for diagnosis.

## Known evidence
Three POST 422 responses at 2026-11-12 22:59:08.483Z, 22:59:23.011Z, 23:58:20.354Z on stripe-test-webhook. Nearby membership-test-webhook 400s are not proven to share event IDs. Historical 422 root causes remain unresolved. Supabase confirmation_email_status=sent is provider API acceptance at most; Resend delivery unverified; provider_message_id missing.

## Guardrails
No payments, Checkout sessions, email sends, webhook retries, production deployments, live billing changes, subscription/entitlement changes, homepage edits or Supabase plan upgrades.

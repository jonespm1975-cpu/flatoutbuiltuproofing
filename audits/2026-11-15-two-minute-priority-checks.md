# Flat Out Built-Up Roofing — two-minute priority checks
**Date:** 15 November 2026 (Europe/London)  
**Scope:** Read-only continuation checks. No checkout, charge, email, webhook retry, data mutation, deployment, or Stripe setting change.

## Completed checks

1. **Stripe mode and webhook separation**
   - Confirmed separate Stripe Live and Test Mode accounts.
   - Live has one enabled endpoint at the production `stripe-webhook` URL, subscribed to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
   - Test Mode has separate enabled course and membership endpoints. The course endpoint receives Checkout completion events; the membership endpoint receives subscription and invoice lifecycle events.
   - No webhook delivery was attempted.

2. **Live price and tax configuration**
   - Read the price referenced by `stripe-live-checkout`: active one-time GBP 9.99, `tax_behavior=inclusive`.
   - Stripe Tax Live settings: active, default behavior `exclusive`, GB head-office country with no street/postcode, and zero tax registrations.
   - The deployed live checkout function does not set Stripe automatic tax or an allowed-country restriction. Its allowed website Origin is a CORS control; it does not enforce UK-only customer location.
   - These settings are not yet consistent with a verified UK-only, tax-reviewed launch. No settings were changed. Tax treatment and obligations still need owner/qualified review; this record makes no tax-law determination.

3. **Owner receipt and retry path**
   - Read-only Supabase query identified the latest owner Test Mode course receipt: £11.99 total, status `pending`, no sent timestamp, no stored email error.
   - Its sandbox queue row is `pending`, 0 attempts, no provider message ID, and no active lease.
   - Deployed `purchase-email-retry-worker` v10 is explicitly dry-run: sending, claiming and scheduling are disabled. It was not invoked.
   - The authenticated `my-purchase-confirmations` function filters receipts by the signed-in user, but the owner-facing runtime path and email delivery were not verified. Resend status access is unavailable in this session. No retry or email send was made.

4. **Live records check**
   - Supabase currently has 0 live course-access rows, 0 live course receipts, 0 live email outbox rows and 0 live membership rows. The two course-access rows and two receipts are Test Mode.
   - This is a current data-count check, not proof of checkout readiness.

## Still blocked

- UK-only location enforcement and a consistent, owner-approved tax configuration require a reviewed live checkout change; no such change was authorized in this task.
- Owner receipt delivery requires provider-status access (Resend) and the authenticated owner path. Do not retry until existing provider status is checked.
- Stripe Dashboard event retry remains unavailable without passkey access; no retries were made.
- Live checkout flag values and Supabase secrets/feature flags are not readable through the available connected tools. No assumptions were made about their values.

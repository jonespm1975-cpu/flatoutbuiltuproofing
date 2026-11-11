# Live payment launch audit — 11 November 2026

## Verified in connected source code
- Live checkout function `stripe-live-checkout` v7 requires an authenticated Supabase user, matching website Origin, and three affirmative consent fields.
- Live checkout uses Stripe price `price_1UaRJvKeIprRDTKxKDawW6ZG` and sets `client_reference_id` and consent metadata.
- Live webhook `stripe-webhook` v26 validates Stripe webhook signature, paid status, live mode, checkout metadata, GBP 999 total, one matching price line item and authenticated user mapping before granting access.
- The live checkout and webhook both have independent operator-controlled enable flags.
- Purchase confirmations store the course, customer, amount, consent timestamp, terms version and email status.
- Database RLS: `course_access` permits authenticated users to SELECT only their own access; `purchase_confirmations` has RLS enabled with no public policies and is read through a separately authenticated edge function.
- Supabase security advisor reports a warning that leaked-password protection is disabled.

## Not yet verified / must not be marked complete
- Resend secrets `RESEND_API_KEY` and `PURCHASE_CONFIRMATION_FROM` exist and match a verified sending identity.
- Delivery of an actual durable purchase-confirmation email to a customer.
- The email's contract information, terms, cancellation notices and merchant-of-record details are legally sufficient.
- Whether all live Stripe webhook signing secrets, price IDs, function secrets and deployment flags are configured correctly. Code inspection does not reveal environment variable values.
- Controlled live-mode end-to-end payment, webhook event, lesson access, confirmation email and cancellation/refund behaviour.
- Independent review of full legal documents and course completeness.
- Enable leaked-password protection in Supabase Auth if available on the plan.
- Independent mobile-browser accessibility and visual testing.

## Launch decision
**NO-GO.** Leave live checkout and unlocking disabled until the missing tests and reviews are completed. Do not activate the 50p weekly subscription.

## Recommended next operator actions
1. In Supabase Edge Function Secrets, check `RESEND_API_KEY`, `PURCHASE_CONFIRMATION_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_LESSON_COURSE_ID` and `STRIPE_LIVE_CHECKOUT_ENABLED` without copying secret values into chat.
2. Verify sender identity in Resend and deliver a non-payment test email.
3. Review UK digital-content contract terms, immediate-supply consent, durable confirmation and refunds with appropriate professional advice.
4. Verify Stripe price, tax and merchant-of-record configuration and run a controlled live transaction only when ready.
5. After confirming every launch gate, enable live checkout deliberately, monitor logs and record the launch date.

This report is an engineering checkpoint, not legal advice or proof of production readiness.

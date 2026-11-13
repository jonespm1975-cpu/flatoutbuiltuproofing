# Launch readiness gate — 2026-11-13

## Verified sandbox Stripe price objects (read-only)
- Course price price_1UaRCSKS41qhUQTKl2uSNnYN: active, livemode=false, GBP 999, one_time, tax_behavior=inclusive, product prod_VVEzfZgo910hMH.
- Membership price price_1Ub4eYKS41qhUQTK2upRvWY9: active, livemode=false, GBP 199, recurring month interval_count=1, tax_behavior=inclusive, product prod_VcJHddQAtEItLc.
- Live price and checkout settings NOT verified. No payment or checkout session created.

## Supabase read-only check
sandbox_email_retry_queue: 1 accepted, 0 provider_message_id. Resend delivery unverified. Existing worker v10 dry-run, sending_enabled=false, claiming_enabled=false. No database writes.

## Material legal blockers verified from main branch
- terms.html title/H1 explicitly DRAFT, warning owner review required before commercial launch, states paid access not yet enabled, no fully tested membership terms.
- privacy.html DRAFT, explicit placeholder retention periods and processing/transfer details, age and marketing details unconfirmed.
- refunds.html DRAFT and says paid courses not enabled; digital content consent/cancellation checkout implementation requires review.
- cookies.html DRAFT and NOT FOR PUBLICATION WITHOUT UK LEGAL REVIEW, lacks actual cookies inventory and working consent choices.

## Launch gate
DO NOT enable customer billing or production email sending until legal pages are completed and published, consent and cancellation flow verified, actual live prices and webhook fulfilment audited, Resend provider-side evidence reconciled, and isolated two-connection database concurrency tested. No claim of end-to-end completion.

## Safe next work
1. Prepare revised legal page drafts on audit branch without changing homepage, and obtain owner/legal review on business-specific retention and cancellation policies.
2. Confirm live Stripe prices/webhook configuration read-only and test checkout-to-entitlement using mocked events or pre-existing sandbox events without replay.
3. Run real isolated database tests; provider ID persistence only after proven no duplicate sends.
4. Recheck production after approval; controlled activation only if all gates pass.

No emails, payments, Checkout sessions, webhook replays, customer record modifications, live billing changes or deployments were made.

# Sandbox webhook hardening review — 2026-11-13

## Scope and verification
Read-only comparison against deployed Supabase functions: stripe-test-webhook v25, membership-test-webhook v9 and purchase-email-retry-worker v10. Added isolated synthetic-data mirror test file to audit branch; NOT executed or deployed. This is not a proof of Stripe delivery or Resend inbox delivery.

## Findings
1. Course webhook v25 logs full Stripe event IDs in the membership-ignore and unlock-disabled branches. For future deployments, use fixed diagnostic codes and no raw IDs in routine logs. Never log signing signatures, raw event bodies, customer email or service keys.
2. Current course webhook accepts amount_total >=999 when amount_subtotal=999, so historical £11.99 tax-exclusive total is not itself sufficient to cause a 422. Historical old price ID differs from the current allowlisted price ID, so price mismatch is a *possible* cause if such an event were replayed to v25; there is no verified mapping between the three 422 requests and their event IDs.
3. Current course webhook sends directly to Resend when purchase_confirmations.confirmation_email_status != 'sent'. It marks sent on provider HTTP success but does not persist provider response ID or verify delivered/bounced status. The queue's accepted status cannot prove inbox delivery. Changing this requires careful migration and idempotent tests, not an unreviewed live patch.
4. Course webhook returns HTTP 200 after email API failure even though access is granted. Retry worker v10 is explicitly dry-run; recovery depends on other queue/scheduling components and should not be assumed automatic.
5. Current membership webhook v9 rejects invalid signatures with HTTP 400 and live events with HTTP 400; historical 400 requests cannot be distinguished from status alone. Membership checkout session events are intentionally ignored with HTTP 200 after successful signature verification.
6. Mirror tests cover valid paid course, subscription routing, invalid signature, live event, ignored event, unpaid checkout, unlock-disabled, missing mapping, wrong metadata, missing consent, both 999 and 1199 totals, wrong price, multiple line items, wrong quantity, unknown user and redacted output. They are independent models, not tests against deployed code.

## Next safe work
- Execute the branch test file in an isolated Node environment and record exact stdout and exit code.
- Compare synthetic mirror tests with actual source and add mock-based tests around Resend provider ID parsing without calling Resend.
- Obtain Stripe Workbench delivery event IDs, destinations and response bodies to resolve historical 422s; obtain provider-side Resend delivery status.
- Only then propose code changes in a reviewable branch; do not deploy or replay events without validated tests and explicit approval where customer-facing behavior may change.

## Guardrails
No sends, payments, Checkout sessions, webhooks replayed, database writes, Supabase function deployments, production changes, existing subscription or entitlement changes, homepage changes, or plan upgrades.

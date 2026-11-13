# Tasks 269–273 follow-up — historical tax and remaining blockers — 2026-11-13

## New verified Stripe line-item findings
Retrieved all three original TEST Checkout Session line items:
- cs_test_a0TY2kMZoZpfg5ceI4lrSvnknG6ihGgkVhrpseYkvr6eHAyOWtnL5PHt5u: subtotal GBP 999, tax GBP 200, total GBP 1199; price_1UaPSRKS41qhUQTK2BbUBUTf. Tax added on top.
- cs_test_a0DwPblxRGoAzNBGVWY5g2qA5lqMgnxO7WVWN231zQcErjsdhdJeYMzzZG: subtotal GBP 999, tax GBP 167, total GBP 999; price_1UaRCSKS41qhUQTKl2uSNnYN. Tax included in total.
- cs_test_a0caswbXc3HIkD4VZJRQ7ZZ3W6dT5TICnhxcb0PZ0v1gYUOhHT5v00Ssye: subtotal GBP 999, tax GBP 167, total GBP 999; same later price. Tax included.

The £11.99 versus £9.99 historical total difference is explained by tax-exclusive versus tax-inclusive test checkout configurations. This does NOT prove UK VAT compliance, especially as business owner has stated they are not VAT registered. Do not modify tax settings without a separate review.

## Verified email retry negative tests
Executed against installed RPCs: zero-limit claim -> 0; sandbox-session finalization -> false; missing-provider-id accepted finalization -> false; invalid token -> false. No persistent changes. Installed claim function uses FOR UPDATE SKIP LOCKED; real concurrent execution still unproven.

## Outstanding blockers
269: two independent overlapping PostgreSQL connections unavailable; do not certify.
270: actual simultaneous claim/lease-expiry contention remains untested; negative tests pass.
271: Stripe event evt_1Ub6xTKS41qhUQTKCAsjwHU2 remains pending_webhooks=1; no supported event retry action through connected API. Manual Stripe Workbench retry of this existing TEST event to stripe-test-webhook only is required.
272: numerical tax discrepancy explained, but two sandbox access records lack receipts and one sandbox receipt lacks access; no automatic writes to test records because historical intent and side effects unknown.
273: direct Resend provider delivery not available through connected tools. Supabase shows sent; do not conflate with delivered.

No emails, payments, live changes, database record edits or webhook retries performed.

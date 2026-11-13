# Task 32 — Sandbox checkout reconciliation and recovery audit
Date: 2026-11-13 UTC
Status: SERVICE-ROLE-ONLY READ-ONLY RECONCILIATION RPC IMPLEMENTED; NO CHECKOUT OR PAYMENT CREATION.

## Stripe sandbox evidence
Read three existing Checkout sessions using GET only in sandbox account:
- cs_test_a0caswbXc3HIkD4VZJRQ7ZZ3W6dT5TICnhxcb0PZ0v1gYUOhHT5v00Ssye: complete, paid, livemode false, amount 999 GBP minor units.
- cs_test_a0DwPblxRGoAzNBGVWY5g2qA5lqMgnxO7WVWN231zQcErjsdhdJeYMzzZG: complete, paid, livemode false, amount 999 GBP minor units.
- cs_test_a0TY2kMZoZpfg5ceI4lrSvnknG6ihGgkVhrpseYkvr6eHAyOWtnL5PHt5u: complete, paid, livemode false, amount 1199 GBP minor units.
The first two sessions correspond to the same user and course (historical duplicate sandbox payments); no refunds or mutations attempted.

## Supabase
- Existing reservations: 0; existing course_access entitlements: 2.
- Created public.inspect_test_course_checkout_reconciliation(uuid,text) as SECURITY DEFINER with fixed search_path, EXECUTE only for service_role (anon denied).
- RPC is READ ONLY; returns owned / none / manual_stripe_lookup_required / verify_original_stripe_session. It never clears a reservation or initiates Stripe Checkout.
- Rollback-only SQL assertions passed: entitled user => owned; synthetic unreserved user => none; synthetic reserved user => manual_stripe_lookup_required; rollback leaves zero reservations.
- No subscription or live billing mutation.

## Safe administrator reconciliation procedure
1. Authenticate an authorized administrator using a trusted backend with service-role credentials; never expose service-role keys to the browser.
2. Call inspect_test_course_checkout_reconciliation(user UUID, 'beginner-training-course').
3. If owned, do not sell the course again. If none, no reservation to reconcile.
4. If session ID exists, GET original session in sandbox Stripe; validate livemode=false, user and course metadata, status, payment_status. If open and unpaid, return original session URL to the authenticated owner; if paid, reconcile entitlement/webhook rather than create checkout.
5. If reservation lacks session ID, use Stripe sandbox event and Checkout-session searches to determine whether the idempotent creation succeeded. Do not blindly reset. Do not create a new Checkout session until no chargeable original can exist, with audit evidence and a separately reviewed reset procedure.
6. If session expired, still check for successful payment or delayed events before any manual reset. Current system intentionally has no automatic reservation deletion.
7. Document evidence and obtain separate authorization for any mutation; this task implemented no reset operation.

## Limits and outstanding checks
- COURSE_TEST_CHECKOUT_V2_ENABLED value cannot be read with the available connector; code checks for exact string true, but its actual state is UNVERIFIED.
- No Stripe Checkout sessions or payments created. No full HTTP integration test or live read-only Stripe retrieval from within Edge Function was performed.
- Task 32 supplies a secure read-only admin classification mechanism and procedure, NOT automated checkout reset or full end-to-end certification.
- Homepage, existing cancellation, Supabase Free plan and live billing unchanged.

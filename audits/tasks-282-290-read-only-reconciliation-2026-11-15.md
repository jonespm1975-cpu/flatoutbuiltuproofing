# Tasks 282–290 — Fresh read-only reconciliation — 2026-11-15

All checks were performed against connected Supabase project fhyhshakmvqwzdyannec and Stripe TEST account acct_1UaPRuKS41qhUQTK. No writes to payment, entitlement or email records; no email, checkout, charge, retry or deployment.

## Verified checks
282. Supabase course_access count: 2.
283. Supabase purchase_confirmations count: 2 (previous reported 1; one historical receipt is now present).
284. Course-access without matching receipt: 1 (previous reported 2).
285. Receipt without matching course-access: 1 (unchanged).
286. Live email outbox count: 0.
287. Pending confirmation receipts: 1; failed confirmation receipts: 0.
288. Live course_access: 0; live purchase_confirmations: 0.
289. Stripe TEST checkout.session.completed event evt_1Ub6xTKS41qhUQTKCAsjwHU2 now pending_webhooks=0 (previously 1). This indicates Stripe no longer reports a pending webhook for the event. It does not independently prove the target endpoint returned HTTP 200, nor that delivery was to the correct endpoint. No retry performed in this run.
290. Historical receipt comparison: The GBP 1199 test session cs_test_a0TY2kMZoZpfg5ceI4lrSvnknG6ihGgkVhrpseYkvr6eHAyOWtnL5PHt5u now has a purchase_confirmations record with terms_version=sandbox-test, email_status=pending, no email_sent_at or error. It also has course_access. GBP 999 session cs_test_a0DwPblxRGoAzNBGVWY5g2qA5lqMgnxO7WVWN231zQcErjsdhdJeYMzzZG still has course_access without receipt. GBP 999 session cs_test_a0caswbXc3HIkD4VZJRQ7ZZ3W6dT5TICnhxcb0PZ0v1gYUOhHT5v00Ssye has receipt status=sent and no course_access.

## Interpretation and safety
Two meaningful changes since prior audit: pending Stripe webhook counter cleared (1 -> 0), and one historical receipt was added (receipt count 1 -> 2). Their causes were not established by these read-only checks. Do not assume either was performed by this automation. The new receipt is pending, sandbox-test, GBP 1199; do not send an email or alter it without explicit approval. The £11.99 test total was previously traced to GBP 999 subtotal + GBP 200 additional tax, versus GBP 999 tax-inclusive later sessions.

## Remaining blockers
- Need delivery-attempt HTTP response and endpoint details for the cleared Stripe event.
- Genuine simultaneous two-connection claim contention not yet proven with direct PostgreSQL connections; staged harness is not executed.
- Independent Resend provider delivery remains unverified (no Resend connector).
- Remaining two receipt/access discrepancies require historical-intent reconciliation; do not backfill entitlements or receipts automatically.

Only tasks 282–290 are counted as executed here; no claim that tasks 291–367 ran.

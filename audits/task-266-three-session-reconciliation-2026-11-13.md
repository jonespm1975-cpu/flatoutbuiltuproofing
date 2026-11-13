# Task 266 — Three sandbox checkout reconciliation and email state — 2026-11-13

Read-only Stripe TEST and Supabase verification.

## Historical checkout records
- cs_test_a0TY2kMZoZpfg5ceI4lrSvnknG6ihGgkVhrpseYkvr6eHAyOWtnL5PHt5u: paid/complete, 1199 GBP, correct course/user/consent; course_access present; purchase_confirmations absent. Investigate historical total versus advertised 999; no backfill without understanding legacy fulfilment.
- cs_test_a0DwPblxRGoAzNBGVWY5g2qA5lqMgnxO7WVWN231zQcErjsdhdJeYMzzZG: paid/complete, 999 GBP, correct course/user/consent; course_access present; purchase_confirmations absent.
- cs_test_a0caswbXc3HIkD4VZJRQ7ZZ3W6dT5TICnhxcb0PZ0v1gYUOhHT5v00Ssye: paid/complete, 999 GBP, correct course/user/consent; purchase_confirmations present, terms_version=sandbox-test; course_access absent. Do not automatically unlock: may be intentional isolated sandbox test.

## Email reconciliation
For third session, purchase_confirmations.paid_amount_pence=999, confirmation_email_status=sent, confirmation_email_sent_at=2026-11-12 22:28:36.658 UTC, confirmation_email_error=null. Supabase function_edge_logs returned HTTP 200 for stripe-test-webhook at 22:28:37.008 UTC. Strong timing correlation, not proof of Resend delivered status. No direct Resend provider API available.

## Pending Stripe event
£1.99 membership event evt_1Ub6xTKS41qhUQTKCAsjwHU2 still pending_webhooks=1 on latest read. No retry tool exposed.

## Remaining blockers
Genuine two-connection row contention and Resend provider delivery verification not completed. No database writes, emails, charges, event resends or production deployments performed.

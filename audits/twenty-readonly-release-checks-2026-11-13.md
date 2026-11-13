# Twenty read-only release checks — 2026-11-13

Executed as a single aggregate SQL SELECT against connected Supabase project `fhyhshakmvqwzdyannec`. Counts below are observed, not simulated. No user identifiers or secret values are included.

1. `invalid_access_session_prefix`: **0** — clear
2. `unexpected_access_course`: **0** — clear
3. `duplicate_access_triplets`: **0** — clear
4. `orphan_access_user`: **0** — clear
5. `invalid_confirmation_session_prefix`: **0** — clear
6. `unexpected_confirmation_amount`: **0** — clear
7. `unexpected_confirmation_currency`: **0** — clear
8. `orphan_confirmation_user`: **0** — clear
9. `missing_confirmation_consent_time`: **0** — clear
10. `missing_confirmation_time`: **0** — clear
11. `sent_without_timestamp`: **0** — clear
12. `nonsandbox_email_queue`: **0** — clear
13. `invalid_email_attempts`: **0** — clear
14. `accepted_without_provider_id`: **1** — unresolved discrepancy
15. `leased_without_token`: **0** — clear
16. `live_membership_rows`: **0** — clear
17. `unexpected_sandbox_membership_price`: **0** — clear
18. `scheduled_cancellations`: **1** — expected cancellation preserved
19. `access_without_confirmation`: **2** — unresolved discrepancy
20. `confirmation_without_access`: **1** — unresolved discrepancy

## Interpretation
16 checks clear, 3 unresolved discrepancies, 1 scheduled cancellation that must remain untouched. These are database integrity checks, **not** 20 fully implemented feature fixes or 20 end-to-end tests. Historical records cannot be repaired without Stripe event and Resend provider reconciliation.

## Release holds
Live £9.99 checkout remains disabled; £1.99 membership live billing remains disabled. Do not send emails, replay Stripe events, generate payments or checkout sessions, or alter entitlements to force matching counts. Complete Stripe account reconnection, Resend delivery inspection, two-connection sandbox concurrency test, legal review, and actual authenticated purchase fulfilment test first.

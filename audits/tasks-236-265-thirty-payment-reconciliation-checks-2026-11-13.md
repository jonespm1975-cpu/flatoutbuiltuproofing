# Tasks 236–265 — Thirty payment reconciliation and safety checks — 2026-11-13

Read-only verification. No payments, emails, webhook retries, deployments, subscriptions or customer records changed.

## Stripe historical sessions (Tasks 236–237)

- 236: Stripe session cs_test_a0TY2kMZoZpfg5ceI4lrSvnknG6ihGgkVhrpseYkvr6eHAyOWtnL5PHt5u is complete, paid, GBP 1199 (£11.99), mode=payment, expected course ID and matching user metadata/consents. Its course_access record exists; matching purchase_confirmations record does not. This differs from nominal £9.99 and requires historical tax/price investigation; no refund or entitlement change authorized.
- 237: Stripe session cs_test_a0DwPblxRGoAzNBGVWY5g2qA5lqMgnxO7WVWN231zQcErjsdhdJeYMzzZG is complete, paid, GBP 999 (£9.99), mode=payment, expected course ID and matching user metadata/consents. Its course_access record exists; matching purchase_confirmations record does not.

## Database checks (Tasks 238–265)

| Task | Check | Observed count |
|---|---|---:|
| 238 | course access missing session | 0 |
| 239 | course access missing course ID | 0 |
| 240 | course access missing user ID | 0 |
| 241 | course access missing auth user | 0 |
| 242 | live course access rows | 0 |
| 243 | sandbox course access rows | 2 |
| 244 | receipt missing session | 0 |
| 245 | receipt missing user ID | 0 |
| 246 | receipt missing course ID | 0 |
| 247 | live receipt rows | 0 |
| 248 | sandbox receipt rows | 1 |
| 249 | receipt missing auth user | 0 |
| 250 | receipt missing terms version | 0 |
| 251 | receipt non-GBP or missing currency | 0 |
| 252 | duplicate course session IDs | 0 |
| 253 | duplicate receipt session IDs | 0 |
| 254 | live outbox leased | 0 |
| 255 | live outbox failed | 0 |
| 256 | live outbox pending | 0 |
| 257 | live outbox accepted | 0 |
| 258 | matching session mismatched user | 0 |
| 259 | matching session mismatched course | 0 |
| 260 | receipt without course access | 1 |
| 261 | course access without receipt | 2 |
| 262 | sandbox beginner course access | 2 |
| 263 | sandbox beginner receipts | 1 |
| 264 | sandbox other-course access | 0 |
| 265 | sandbox other-course receipts | 0 |

## Interpretation

- Missing auth references, missing key fields, duplicate checkout session IDs, and outstanding live outbox rows all returned zero.
- One sandbox receipt has no course_access match: session cs_test_a0caswbXc3HIkD4VZJRQ7ZZ3W6dT5TICnhxcb0PZ0v1gYUOhHT5v00Ssye, terms_version=sandbox-test, course_id=beginner-training-course, currency=gbp. This may reflect sandbox-only receipt creation and must not be automatically fulfilled.
- Two paid historical sandbox course sessions lack matching purchase receipts. Historical handler behavior must be reviewed before backfilling.
- No actual two-connection row-lock contention, signed webhook HTTP replay, or Resend provider API delivery check was completed in these thirty tasks. Historical Stripe membership event pending status remains a separate blocker.

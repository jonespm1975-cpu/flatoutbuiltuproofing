# Tasks 299–303 — 2026-11-17 read-only verification

## 299 — Historical receipt snapshot
PASS (read): purchase_confirmations has exactly two sandbox rows: cs_test_a0caswbXc3HIkD4VZJRQ7ZZ3W6dT5TICnhxcb0PZ0v1gYUOhHT5v00Ssye (GBP 999, status sent, sent_at 2026-11-12 22:28:36.658+00, sandbox-test terms), cs_test_a0TY2kMZoZpfg5ceI4lrSvnknG6ihGgkVhrpseYkvr6eHAyOWtnL5PHt5u (GBP 1199, status pending, sent_at null, sandbox-test terms).

## 300 — Course access snapshot
PASS (read): course_access has two rows: cs_test_a0DwPblxRGoAzNBGVWY5g2qA5lqMgnxO7WVWN231zQcErjsdhdJeYMzzZG and cs_test_a0TY2kMZoZpfg5ceI4lrSvnknG6ihGgkVhrpseYkvr6eHAyOWtnL5PHt5u, both beginner-training-course. Therefore one access lacks receipt (a0Dw...) and one receipt lacks access (a0cas...). No records changed.

## 301 — Live email queue state
PASS (read): internal.live_purchase_email_outbox count=0, pending=0, leased=0. This does not independently prove email delivery or absence of historic events.

## 302 — Installed retry function fingerprint
PASS (read): pg_get_functiondef MD5: claim_live_purchase_email_retry=ed920ab6008eefd0761405afae210af3; finish_live_purchase_email_retry=3a8288777b158e6feec22cf4cb1f1bb9. Fingerprints are a baseline, not proof of concurrency.

## 303 — Stripe historical event
PASS (read): TEST event evt_1Ub6xTKS41qhUQTKCAsjwHU2, type checkout.session.completed, livemode=false, pending_webhooks=0 at time of this check. Counter does not prove HTTP status or destination.

## Open blockers
- Actual two independent simultaneous PostgreSQL connections/claim contention not available through SQL connector.
- Direct Resend provider delivery evidence not available.
- Stripe endpoint-specific HTTP delivery response unavailable.
- Two historical sandbox receipt/access mismatches remain deliberately untouched; do not backfill automatically.

No emails, charges, Checkout sessions, webhook retries, production deployments, billing, subscription, entitlement or homepage changes.

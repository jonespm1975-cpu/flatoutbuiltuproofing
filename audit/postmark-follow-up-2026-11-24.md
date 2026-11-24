# Confirmation testing, 24 November 2026

The sandbox Stripe course handler v38 rejects an invalid consent timestamp before contacting Stripe or writing any entitlement. Inspected deployed source after the update. Payment configuration and live webhook were untouched.

A rolled-back sandbox receipt and queue replay produced one sandbox row with zero attempts and no corresponding live outbox or future confirmation job. The deployed sandbox retry worker is a read-only dry run and cannot deliver a Postmark receipt.

The PostgreSQL concurrency test used an isolated schema and the deployed claim function definition with only schema references redirected. Session 1544055 claimed one job and held its transaction from 19:40:00.143 to 19:40:06.149 UTC. Session 1544056 observed its advisory lock, claimed zero and returned at 19:40:00.245. Both temporary schedules and the test schema were removed.

Six offline Node regression tests passed against the actual Edge entrypoints with simulated SDKs and Postmark transport. Cases include malformed consent, successful acceptance, provider rejection, recipient mismatch, timeout, and a failed database completion after acceptance. No email was transmitted by these tests.

A fresh signed sandbox checkout through to an owner inbox is still outstanding. The Stripe connectors listed only live mode. Customer sending is off.

# Tasks 308–316 — 2026-11-19 read-only verification

Supabase project: fhyhshakmvqwzdyannec. Stripe TEST account: acct_1UaPRuKS41qhUQTK. No live or sandbox mutations, webhook retries, emails, charges, new Checkout sessions or production deployments.

- **308** Supabase purchase confirmations read: 2 sandbox records. One £9.99 sent 2026-11-12 22:28:36.658 UTC, one £11.99 pending with no sent timestamp. Both sandbox-test terms. PASS read.
- **309** Course access read: 2 sandbox session records. PASS read.
- **310** Live email outbox count 0, leased 0, failed 0. PASS read.
- **311** Installed email retry function MD5 fingerprints: claim_live_purchase_email_retry = ed920ab6008eefd0761405afae210af3; finish_live_purchase_email_retry = 3a8288777b158e6feec22cf4cb1f1bb9. PASS fingerprint captured; no claim of unchanged versus previous hashes without direct comparison.
- **312** Stripe TEST event evt_1Ub6xTKS41qhUQTKCAsjwHU2 read: type checkout.session.completed, livemode false, pending_webhooks 0. PASS counter; endpoint-specific HTTP response still unknown.
- **313** Course access lacking receipt count 1. PASS diagnostic; mismatch remains unresolved.
- **314** Receipt lacking course access count 1. PASS diagnostic; mismatch remains unresolved.
- **315** Invalid sent/pending email timestamp consistency count 0. PASS diagnostic.
- **316** Non-test purchase receipt count 0. PASS diagnostic.

Known remaining blockers: direct Resend provider delivery evidence; two independent simultaneous PostgreSQL sessions for concurrency; Stripe endpoint-specific HTTP delivery confirmation; historical unmatched sandbox receipt/access. No records backfilled because test-only and user prohibits modifying entitlements. The task numbers mean executed checks, not closed defects.

Read-only evidence collected using Stripe API GetEventsId and Supabase execute_sql on 2026-11-19.

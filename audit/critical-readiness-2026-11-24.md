# Critical readiness audit — 24 November 2026

Verified: one historical live GBP 9.99 Stripe checkout matched to Supabase confirmation and course access; no missing access; one accepted email with provider reference, delivery unverified. Live GBP 5 monthly price exists; no live subscriptions on inspected account. Membership checkout/webhook/portal source staged, not deployed. All 11 public and 5 internal tables have RLS enabled. Membership recovery lookup service-role only; no reservation rows. Postmark integration present in future confirmation worker; delivery not verified.

Release blockers: genuine overlapping concurrency test, membership recovery and lifecycle tests, production portal configuration, signed webhook setup, Postmark delivery evidence, privileged order RPC access testing, compromised password protection assessment. Keep existing live billing settings and website design unchanged. No charges or email sends performed by audit.

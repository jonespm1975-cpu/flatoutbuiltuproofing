# Sandbox entitlement-to-confirmation reconciliation gap — 2026-11-13

## Read-only evidence from live Supabase database

- `public.course_access` contains **2** rows for `beginner-training-course` whose Stripe session IDs begin `cs_test_`.
- Left join on exact `stripe_checkout_session_id` to `public.purchase_confirmations` returns **0 matching confirmation rows** for those 2 access records.
- Independently, `purchase_confirmations` contains **1** sandbox confirmation marked sent, but it does not match either current course-access row by session ID.
- No identifiers, customer emails or personal data copied into this audit.

## Interpretation

Sandbox course access and email-confirmation records are not currently reconcilable on the session ID for these rows. This may be historical data or mismatched webhook versions; root cause not proven. Do **not** send/resend email or grant/revoke entitlements merely to force counts to agree. Inspect Stripe historical event IDs, session ownership, webhook version, and Resend provider logs first.

## Release gate

A new isolated sandbox transaction must show authenticated test checkout -> signed paid webhook -> exactly one course entitlement -> exactly one matching purchase confirmation -> recorded Resend provider acceptance/delivery event. The existing data do not prove this flow.

No changes to customer access, payments, emails, database or live settings.

# Task 225 — Membership checkout course-access isolation — 2026-11-13

Stripe sandbox event evt_1Ub6xTKS41qhUQTKCAsjwHU2 remains pending_webhooks=1, mode=subscription, £1.99.
Read-only Supabase queries for its session cs_test_a04ZHXq0Z9NAXC09vZaAkXHgZcpxLDfy56fZLBqYbISkbnyNoAVGnvlhpu:
- public.course_access rows: 0
- public.purchase_confirmations rows: 0

Result: PASS for historical membership checkout not creating one-time course entitlement or purchase receipt. Does not establish membership subscription entitlement state or resolve Stripe pending delivery. No writes, event retries, emails, charges, or live settings changes.

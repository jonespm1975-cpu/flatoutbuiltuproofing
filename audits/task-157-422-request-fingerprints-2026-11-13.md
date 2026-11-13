# Task 157 — HTTP 422 request fingerprinting (2026-11-13)

Read-only Supabase function_edge_logs, 2026-11-12 22:00–2026-11-13 00:00 UTC:

| UTC | HTTP | deployment version | request ID | execution ID | request content-length |
|---|---|---|---|---|---|
| 22:59:08.483 | 422 | 20 | 01a1d1fc-7de0-78ed-b0c2-fbe4b52c2cc6 | 9e5288d4-42bd-4454-a17e-cf0b9949ff7a | 4325 |
| 22:59:23.011 | 422 | 20 | 01a1d1fc-b816-7322-955b-bd142a5a14e8 | 851bb635-036b-4059-8aef-d317ad35bd76 | 4325 |
| 23:58:20.354 | 422 | 23 | 01a1d232-b094-772b-a0df-d12ca3a14948 | 3d39363b-bdb3-440b-b631-c538b292605f | 4325 |

All were POST to stripe-test-webhook, user-agent Stripe/1.0 (+https://stripe.com/docs/webhooks), content-type of response text/plain;charset=UTF-8. Identical content lengths are suggestive of repeated event deliveries but not proof of identical event IDs. Different deployment versions 20 and 23 demonstrate failures persisted across code revisions; cannot use current version 25 alone to assign a reason. No raw webhook body or response body available. Exact event matching remains blocked until Stripe Workbench delivery attempt details or original request IDs are exposed. Avoid attributing 422 to a specific validation branch without evidence.

No writes to Supabase, Stripe, Resend or website. Audit branch only.

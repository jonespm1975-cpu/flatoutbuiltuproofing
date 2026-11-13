# Launch validation — 2026-11-13
Live Stripe account acct_1UT8NBKeIprRDTKx GetPrices returned only two active one-time GBP 999 prices: price_1UaRJvKeIprRDTKxKDawW6ZG tax_behavior inclusive, price_1UUEVgKeIprRDTKxRUrgRRCN tax_behavior unspecified. No live £1.99 recurring price in returned list (has_more=false). The sandbox £1.99 price must not be confused with live.
Standalone checkout consent validation model and 9 unit tests executed locally: 9 passed, 0 failed. This is not integrated into the live checkout or backed by server-side consent storage. It does not certify legal compliance.
Live legal pages remain marked DRAFT with unfilled privacy and cookie disclosures. Do not publish as final without factual processor/retention details and review.
Resend direct delivery cannot be confirmed with connected tools; accepted queue record has no provider ID. Do not resend it.
Genuine two-session PostgreSQL concurrency not executed: no isolated PostgreSQL instance/client session environment available; do not use customer production data.
No live checkout activation, production deployment, payments, emails or customer changes. Next: verify real live checkout product mapping; finish legal and consent integration; independent Resend evidence; disposable two-session database tests; controlled launch.

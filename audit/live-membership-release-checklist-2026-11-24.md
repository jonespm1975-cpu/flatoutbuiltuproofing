# Production membership release gates

Verified 2026-11-24, read-only: active GBP 500 monthly price `price_1UeNy2KeIprRDTKxLWoER0vk`; legacy GBP 199 monthly price remains active. Zero live subscriptions on inspected account. Existing membership checkout/webhook/portal are test-only. RLS policy allows authenticated users to select own rows. has_active_membership requires live, active, unexpired membership.

Release requirements: separate disabled-by-default live checkout, signed live webhook, authoritative Stripe subscription retrieval, exact price and owner binding, atomic duplicate checkout reservation, stale event protection, failed payment and expiry tests, cancellation portal, separate purchased course access. Verify public routes and legacy price links before activation. No live billing changes authorized by this audit.

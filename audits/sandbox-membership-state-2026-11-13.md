# Historical sandbox membership state — 2026-11-13 read-only check

At 2026-11-12 22:58:55 UTC membership-test-checkout returned HTTP 200. At 22:59:08–24 membership-test-webhook returned four HTTP 400 responses, and stripe-test-webhook returned two HTTP 422 responses. At 22:59:30 paid-lesson-content returned HTTP 200, and its access lookup returned HTTP 200. HTTP 200 on the lookup does not by itself prove a row was returned.

Read-only Stripe GET /v1/subscriptions/{id} for sub_1Ub6xSKS41qhUQTKc7GWuQqT: active, livemode=false, cancel_at_period_end=true, price_1Ub4eYKS41qhUQTK2upRvWY9, item current_period_end 1797116343 (2026-12-12T22:59:03Z).

Read-only Supabase membership_subscriptions row: same subscription ID, active, livemode=false, cancel_at_period_end=true, same price, current_period_end 2026-12-12 22:59:03+00.

Therefore existing sandbox subscription state is currently aligned across Stripe and Supabase, despite historical failed webhook deliveries. Do not assume all event retries succeeded or that historical errors are resolved. No customer changes or payment creation. Remain on deployment HOLD until exact webhook delivery bodies and Resend evidence are reconciled.

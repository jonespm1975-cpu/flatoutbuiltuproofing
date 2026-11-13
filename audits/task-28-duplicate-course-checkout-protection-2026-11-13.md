# Task 28 — duplicate course checkout protection audit
Date: 2026-11-13. Status: GAP VERIFIED; FIX NOT DEPLOYED.

## Confirmed deployed implementation
- Supabase stripe-test-checkout v22 validates origin, test flag, sk_test key, JWT authentication, non-anonymous user and three consent booleans.
- It then directly calls stripe.checkout.sessions.create for the beginner-training-course price_1UaRCSKS41qhUQTKl2uSNnYN. There is no server-side course_access ownership check, active checkout reservation, advisory lock, database atomic claim or Stripe idempotency key.
- Supabase stripe-live-checkout v12 has the same missing entitlement and concurrency checks, but live settings were not touched.
- The existing stripe-test-webhook v24 uses course_access upsert onConflict user_id,course_id ignoreDuplicates=true. This prevents duplicate entitlement rows, not duplicate paid checkouts.
- Historical Stripe TEST records independently prove two paid £9.99 sessions for the same user/course; the course_access row retains the earlier session while the purchase confirmation uses the later session.

## Required safe implementation design (not deployed)
1. Introduce a private, atomic database checkout-claim function or equivalent transaction using a unique (user_id, course_id, environment) key, with status, stable idempotency key, expiry, and Stripe session ID. Restrict execution to a trusted server/service role; do not expose unrestricted SECURITY DEFINER in public.
2. In authenticated checkout endpoint, verify entitlement with service-role server access, then atomically acquire/reuse claim before calling Stripe. Reject owned course with 409 and redirect to My Learning; repeated/concurrent requests return the same reserved checkout or safe pending response.
3. Use a stable Stripe idempotency key derived from the claim, not a new random key per request. Persist session result and release/expire claims safely; handle Stripe call succeeded but database write failed via idempotent recovery.
4. On signed successful webhook, grant entitlement once and mark claim fulfilled. For a second paid session already charged, do not silently discard receipt or attempt an automatic refund without verified policy and approval.
5. Implement and verify the sandbox pathway first; test pre-owned user rejection and concurrent claims without creating payments. Do not activate or modify live billing. Separately review live pathway before future approval.

## Safety and status
No schema mutation, function deployment, Stripe session creation, charge, live billing change, subscription cancellation change or Supabase plan change. A quick entitlement-only check would reduce repeat purchases but not guarantee concurrency safety, so no partial fix is being represented as permanent protection. Task remains open.
# Task 29 — sandbox-only atomic checkout reservation implementation
Date: 2026-11-13 UTC
Status: DATABASE LAYER IMPLEMENTED AND TESTED; EDGE CHECKOUT INTEGRATION NOT DEPLOYED.

## Applied to Supabase project fhyhshakmvqwzdyannec
- Created public.course_checkout_reservations with unique primary key (user_id, course_id, environment), unique nullable Stripe session ID, reservation UUID, status, creation and expiry timestamps.
- CHECK constraints restrict environment to 'test' and status to reserved/session_created/fulfilled.
- Enabled RLS; revoked table privileges from anon and authenticated; granted required privileges to service_role.
- Created public.reserve_test_course_checkout(uuid,text), SECURITY DEFINER with fixed search_path=public,pg_temp, restricted EXECUTE to service_role only.
- RPC validates course ID, acquires pg_advisory_xact_lock keyed to user/course/test, checks course_access ownership, reuses a nonexpired reservation or atomically inserts/replaces an expired claim.
- This RPC never calls Stripe or creates payments. Reservation expiry is 25 minutes.
- Existing stripe-test-checkout v22 was deliberately NOT changed; current checkout still directly calls Stripe. Therefore end-to-end duplicate checkout prevention is NOT yet active.

## Verification
- Read-only privileges: anon_execute=false, authenticated_execute=false, service_execute=true.
- Reservation table RLS enabled.
- Transactional DO assertion (rolled back) checked that existing entitled user returns 'owned'; two repeat requests for synthetic user return same reservation UUID; only one reservation row exists inside transaction.
- After ROLLBACK, reservation_count=0; course_access_count=2; membership cancellation flag still true.
- No Stripe Checkout sessions, charges, subscriptions or webhook retries created.
- No homepage, live checkout, billing flags or Supabase plan changes.

## Remaining critical integration
- Update sandbox Checkout Edge Function to use service_role-only RPC after verified JWT. Reject owned result. For reserved result, call Stripe with a stable idempotency key based on reservation UUID; recover an existing session for repeated requests. Persist session ID safely.
- The Stripe-call-success/database-write-failure case needs a robust retry path and careful TTL handling; expiry must not permit a second chargeable session while the first can still be paid. A 25-minute database TTL alone is NOT sufficient for full payment safety.
- Add an atomic finalize/reconcile RPC and webhook lifecycle integration, then test without creating sessions (mock Stripe calls, static tests, rollback SQL). Deploy only after validation.
- Avoid claiming full protection until checkout endpoint actually uses reservation and idempotency.

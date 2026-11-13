# Task 188 — isolated PostgreSQL environment readiness
Date: 2026-11-13

## Verified environment facts
- Local shell PATH checks for psql, postgres, initdb, pg_ctl, docker and podman returned no executable.
- /usr/lib/postgresql not present in the checked environment.
- Python packages testing.postgresql, pglite, psycopg, pg8000 were not available.
- Prior connected Supabase list_branches returned an empty array; no disposable development branch is available.
- No isolated database created. No actual concurrency test performed. Production unchanged.

## Safe test environment requirements
1. Use independent disposable PostgreSQL with schema matching public.course_access, public.purchase_confirmations, auth.users and internal.live_purchase_email_outbox and the existing enqueue trigger.
2. Install Task 187 review-only v4 SQL in disposable database after checking owner and schema privileges.
3. Use two genuinely separate DB connections and overlapping transactions; include a barrier so both reach the same critical section.
4. Assert idempotent same-session retry, immutable receipt mismatch rejection, same user/course distinct sessions, cross-user session reuse rejection, rollback of entitlement when receipt insert fails, and single outbox job per receipt.
5. Validate anon/authenticated cannot execute RPC; service_role can, under actual PostgREST conditions.
6. Run repeated randomized stress trials, preserve logs, SQLSTATE, timings and before/after counts; destroy disposable DB after evidence is saved.
7. Never copy production customer data or keys into the test environment. Use generated UUID identities and synthetic Stripe-looking IDs; no real Stripe or Resend calls.
8. Obtain approval before provisioning anything chargeable; prefer verified free local or temporary disposable environment.

## Release gate
Task 188 is BLOCKED: environment not provisioned. Task 189 must not be represented as tested until two independent transactions run and evidence is recorded. No production changes.

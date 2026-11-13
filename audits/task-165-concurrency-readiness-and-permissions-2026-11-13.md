# Task 165 — Atomic claim concurrency readiness and permissions (2026-11-13)

## Verified directly from installed PostgreSQL catalog
- internal.claim_sandbox_email_retry_v2(p_limit integer): SECURITY INVOKER (prosecdef=false); anon EXECUTE=false; authenticated EXECUTE=false; service_role EXECUTE=true.
- internal.finish_sandbox_email_retry_v3(p_session text,p_token uuid,p_accepted boolean,p_provider_id text,p_error text): same privilege status.
- Previously inspected source uses FOR UPDATE SKIP LOCKED to claim and locks queue/receipt in finish, checking matching token, unexpired lease and pending sandbox receipt.

## Concurrency execution status
**NOT EXECUTED.** The available Supabase execute_sql connector submits independent SQL queries but does not expose two persistent client sessions with controllable overlapping BEGIN/COMMIT boundaries; a pair of connector calls is not a valid proof of concurrent transaction overlap. No dedicated isolated PostgreSQL clone or two client connections was established. Avoid claiming single-winner behavior as empirically tested.

## Safe next test protocol
1. Provision disposable isolated PostgreSQL database/clone with schema/functions, no customer data, no external Resend or Stripe integrations.
2. Insert synthetic sandbox receipt and queue records in disposable clone only.
3. Open two independent PostgreSQL sessions A/B, coordinate simultaneous BEGIN and claim calls with a barrier; assert only one returns claim token for same session. Repeat 100 iterations.
4. Verify expired lease recovery, stale token finish returns false, duplicate finish false, accepted provider ID persists, and queue/receipt update atomically after injected failure rollback.
5. Run no outbound email and no payments. Only after passing, consider a sandbox-only deployment with separate approval.

## Outcome
Permissions verified; genuine two-session test remains blocked on isolated session capability. No database writes, production changes, emails, payments or deployments.

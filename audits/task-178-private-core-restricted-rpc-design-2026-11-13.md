# Task 178 — private fulfilment core and restricted RPC facade
Date: 2026-11-13
Status: DESIGN REVIEW ONLY; not deployed or tested.

## Read-only verification
Existing public.claim_live_purchase_email_retry(integer) and public.finish_live_purchase_email_retry(text,uuid,boolean,text,text) are SECURITY DEFINER functions. This establishes an existing public RPC wrapper pattern, but does not establish that their privileges are correct. Privileges must be audited separately.

## Proposed design
1. Implement transaction body in internal.fulfil_live_course_purchase_v3 with fixed search_path and schema-qualified references. Keep all existing Task 175 immutable receipt, entitlement and unique-session safeguards. Execute under a narrowly selected owner; inspect RLS bypass requirements.
2. Expose only public.fulfil_live_course_purchase_v3 as a restricted RPC wrapper if internal schema is not available through the configured Data API. It delegates to the internal function and returns a minimal boolean or typed result. The public wrapper itself should be SECURITY INVOKER where feasible; service_role must be granted EXECUTE on both wrapper and internal function. Avoid SECURITY DEFINER wrapper unless privilege tests prove it necessary.
3. CREATE/REVOKE/GRANT together in one reviewed migration transaction. Explicitly REVOKE EXECUTE from PUBLIC, anon and authenticated for BOTH functions, GRANT only to service_role. Verify has_function_privilege for all roles and inspect default privileges. Do not grant USAGE on the entire internal schema to browser roles.
4. Restrict the Edge Function route to verified Stripe webhook requests; server-side payment signature, live mode, price, paid status, user mapping and consent checks are mandatory. Never expose service-role credentials to the client.
5. Use one atomic RPC for grant and receipt; existing trigger inserts outbox. Remove webhook's direct Resend sender only after worker reconciliation and isolated testing.
6. Confirm course_access and purchase_confirmations FK and unique conflicts, immutable receipt fields, idempotent retries, and concurrency with two independent DB sessions.
7. Preserve existing receipt and entitlement rows during cutover; keep live sending flags disabled until authorised and tested.

## Open questions / release blockers
- Confirm exact internal-schema USAGE privileges for service_role and the Data API exposure configuration.
- Confirm default function EXECUTE grants, and whether a SECURITY INVOKER wrapper can invoke internal SECURITY DEFINER core under the intended role.
- Test all role privileges, transaction rollback, two-connection concurrency, trigger enqueue, provider-accepted-but-finalisation-failed, and duplicate purchases in a disposable database.
- No disposable PostgreSQL environment exists in current execution. No production migration or email sending attempted.

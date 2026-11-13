# Task 182 — sensitive table privileges and customer entitlement RLS
Date: 2026-11-13

## Verified (read-only)
Six tables audited: internal.live_purchase_email_outbox, internal.membership_test_checkout_leases, public.course_access, public.course_checkout_reservations, public.purchase_confirmations, public.sandbox_email_retry_queue.
- All six have RLS enabled.
- anon has no SELECT/INSERT/UPDATE/DELETE table privilege on any of the six.
- authenticated has SELECT on course_access only; no INSERT/UPDATE/DELETE on any audited table.
- course_access SELECT policy 'Customers can view their own access' applies TO authenticated with USING ((SELECT auth.uid()) = user_id). No authenticated write policy was found in this focused check.
- service_role has full CRUD on course_access, course_checkout_reservations, purchase_confirmations, sandbox_email_retry_queue; SELECT/INSERT/UPDATE but not DELETE on internal.live_purchase_email_outbox. No table privileges on internal.membership_test_checkout_leases; that table may be accessed only via privileged functions.

## Interpretation and limits
No direct anonymous or authenticated writes to these purchase/entitlement/email tables are indicated by current grants. RLS limits signed-in course_access SELECT to rows matching auth.uid(). This does not prove all RPCs, views, Edge Functions, or other schemas are secure. Security advisor's RLS-without-policy INFO can be intentional on service-only tables.

## Next
Audit public SECURITY DEFINER functions and exposed views for indirect access paths. Leaked-password protection warning remains outstanding. No changes made.

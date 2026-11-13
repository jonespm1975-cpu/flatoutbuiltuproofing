# Customer entitlement and membership RLS checks — 2026-11-13

Read-only queries against actual Supabase PostgreSQL catalog and policies.

## Verified
- `course_access` SELECT policy `Customers can view their own access`, role `authenticated`, predicate `(SELECT auth.uid()) = user_id`.
- `membership_subscriptions` SELECT policy `Members view only own subscription`, role `authenticated`, predicate `(SELECT auth.uid()) = user_id`.
- For both tables, authenticated role has no INSERT, UPDATE, or DELETE table privileges. Customers cannot directly grant or modify their own entitlements via ordinary authenticated Data API access.
- Both tables have RLS enabled (prior check).

## Not asserted
- Does not establish cross-account browser integration test or verified paid webhook grant; those remain separate release gates.
- No SQL mutation, test payments, emails, or live activation.

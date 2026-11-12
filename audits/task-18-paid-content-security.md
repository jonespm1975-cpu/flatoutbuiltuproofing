# Task 18 — Paid lesson authentication & private media launch gates
Prepared: 12 November 2026. This document is a safe audit/test plan, not a claim of completed browser penetration testing.

## Checked against the connected Supabase production project
- Paid lesson Edge Function `paid-lesson-content` version 16 requires verified Supabase JWT, rejects anonymous users, checks the authenticated user's RLS-protected `course_access` row, and **requires a `cs_live_%` checkout grant**.
- `course_access`, `lesson_access`, `membership_subscriptions`: RLS enabled; `anon` has no SELECT grant; `authenticated` has SELECT only, with `user_id = auth.uid()` policies; no client INSERT/UPDATE/DELETE grants.
- `storage.buckets`: **0 buckets**. `storage.objects`: **0 objects**. No publicly served Supabase Storage assets exist currently.
- Existing grants: two `cs_test_%` course grants, zero live `cs_live_%` course grants; zero `lesson_access` grants. Neither sandbox grant can pass the production lesson's new live-only query.
- Existing Stripe test subscription scheduled to cancel 12 December 2026 remains unchanged; no actual payments or subscriptions were created for this audit.
- Public GitHub Pages includes free learning pages, an extensive *proposed* tapered insulation masterclass preview, scripts/storyboards, and owner test pages. Public Pages content cannot be paywalled with CSS/JS alone; marketing previews must remain intentionally free or be moved to server-gated delivery before selling as premium.

## Live unauthenticated endpoint test — NOT RUN
- Attempted `curl https://fhyhshakmvqwzdyannec.supabase.co/functions/v1/paid-lesson-content` without an Authorization header; the container DNS lookup failed, so no HTTP response was received. An alternate external-page fetch could not access the function.
- Do not record HTTP 401/403 as independently verified until a true request with reliable DNS is made. The deployed code has those responses.

## Required acceptance tests before allowing live digital content purchases
1. **No JWT**: GET paid lesson endpoint with the public publishable key but no Authorization; expect 401/403 and **no lesson body**. Supabase gateway may return a distinct invalid-JWT response; distinguish gateway from application code.
2. **Malformed/expired JWT**: expect 401/403 and no lesson.
3. **Authenticated unpaid account**: expect 403, no lesson title/body, no client-created access.
4. **Authenticated customer A vs customer B**: only owner of the live verified checkout grant may read content; customer B must receive 403.
5. **Signed-in sandbox customer** with only `cs_test_%` grant: expect 403 on production paid lesson, regardless of whether the test checkout is paid.
6. **Verified live £9.99 purchaser**, only after authorized live billing and fulfilment checks: expect 200; verify correct lesson and no other premium products accidentally unlocked.
7. **Direct asset request**: enumerate premium videos/PDF/images referenced by paid lesson source; all must be stored privately, served with JWT+entitlement checks or short-lived signed URLs. No secret media URLs or full paid lessons in public GitHub Pages HTML/JS, even if links are hidden.
8. **Logout/revoked user**: expired session must not be allowed to fetch new protected lesson. Avoid long-lived signed media URLs.
9. **Accessibility and cache controls**: responses must be `Cache-Control: no-store`; logout should clear rendered premium content; ensure browser back/forward restoration does not reveal paid content after logout.
10. **System errors**: database/Auth/Stripe service failure should return non-sensitive errors and no lesson content; avoid unredacted secrets, access tokens or Stripe payloads in logs.

## Architecture decisions for future premium media
- Do not make public Storage buckets for paid video/PDF assets. Use a private bucket with RLS or short-lived service-issued signed URLs after authenticated entitlement verification. See https://supabase.com/docs/guides/storage/buckets/fundamentals.
- Avoid embedding paid HTML text or full premium course scripts in GitHub Pages if the intent is monetised access; public repository/site source is retrievable.
- Keep £9.99 perpetual course purchases separate from £1.99 live membership logic; test-mode rows never confer production access.
- Don't create a public Storage bucket or upload production media until final assets, copyright permissions and entitlements are defined.
- The server's current `cs_live_%` filter is an *extra mode separation guard*; provenance of grants must still be trusted only from signed, verified Stripe webhooks.

## Open security items
- Supabase Auth leaked-password protection is disabled according to Security Advisor; investigate availability and verify signup/password-reset behaviour before enabling.
- Run the actual end-to-end unauthenticated, unpaid, cross-user, sandbox-only and owner-paid HTTP tests from a connected client.
- Review other paid content, future tapered insulation lessons and downloadable assets individually before assigning a paid access price.
- Keep live membership billing disabled; preserve test cancellation and current production purchases.

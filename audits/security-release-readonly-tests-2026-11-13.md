# Verified security release checks — 2026-11-13

## Tests executed against connected Supabase project (read-only)

- `internal.claim_sandbox_email_retry_v2`: `anon` EXECUTE false; `authenticated` EXECUTE false.
- `internal.finish_sandbox_email_retry_v3`: `anon` EXECUTE false; `authenticated` EXECUTE false.
- `public.course_access`: RLS enabled; anon SELECT false; authenticated SELECT true; anon INSERT false. Ownership policies must be separately verified.
- `public.membership_subscriptions`: RLS enabled; anon SELECT false; authenticated SELECT true; anon INSERT false. Ownership policies must be separately verified.
- `public.course_checkout_reservations`, `public.purchase_confirmations`, `public.sandbox_email_retry_queue`: RLS enabled; anon SELECT/INSERT false and authenticated SELECT false.
- Supabase security advisor: `auth_leaked_password_protection` WARN (disabled). Five `rls_enabled_no_policy` INFO findings on restricted tables. No policies were added to restricted tables, because this can be an intentional server-only posture.

## Still not verified
- Password protection setting enabled; requires Auth configuration update and verification.
- Full authenticated browser journey; no test account credentials or safe non-billing end-to-end fixture used.
- Stripe webhook event-to-entitlement test and simultaneous two-session claim race.
- Resend provider delivery event; the legacy sandbox confirmation `sent` flag does not prove delivery.
- Privacy retention and processor inventory; final legal review and production publication.

## Safety
No emails sent, no payments/sessions created, no entitlements changed, no billing or homepage changed, no database DDL executed. Live checkout remains on hold.

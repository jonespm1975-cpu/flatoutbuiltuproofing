# Supabase course access / email separation — 23 November 2026

## Production change confirmed
Supabase migration **20261123181441_grant_verified_live_course_before_email_delivery** was successfully applied and audited. It adds an internal AFTER INSERT trigger on `public.purchase_confirmations` to grant the beginner lesson's `public.course_access` entitlement independently of transactional email delivery. It is restricted to live Stripe sessions, course ID `beginner-training-course`, GBP 999 pence and expected terms version. The webhook still controls payment verification before writing a receipt; this trigger is not a substitute for Stripe signature verification.

## Rollback-only tests (no real charge)
- £9.99 payment record granted access with email status still `pending` and a separately queued outbox job.
- £9.98 amount failed to grant access.
- Duplicate receipt did not create an additional receipt.
- All injected test records and outbox rows were rolled back.
- Existing one live course entitlement and two test entitlements were preserved.
- No payment, refund or customer email was triggered.

## Follow-up customer-copy fix
- `members.html`: removed outdated claim that course access waits for confirmation email.
- `purchase-info.html`: removed outdated condition that access begins only after email is sent.
- Content-only edits; approved layout, imagery, colours, hero video and navigation unchanged.

## Outstanding launch blockers
- The Resend-based live email worker remains installed but its five-minute cron schedule is verified **inactive**. Never restart it or send through Resend.
- A reliable, approved alternative must send durable purchase/cancellation documents. Payment unlock works independently, but legal consumer cancellation rights require confirmation and must not be presumed lost before all statutory conditions are met.
- Protected Supabase secrets/activation flags cannot be read from the available connection. User must inspect them; do not change live billing settings without approval.
- Authenticated end-to-end website test, real signed Stripe webhook duplicate/failure tests, and two-database-connection concurrency tests remain outstanding.
- `public.course_access` has user-owned SELECT RLS; the new function is in nonexposed `internal` with restricted EXECUTE privileges.

## Evidence
- Supabase migration recorded in project `fhyhshakmvqwzdyannec`.
- Test output: access before email=true, outbox queued=true, incorrect amount denied=true, duplicate denied=true, rollback rows=0, worker schedule inactive=true.
- Final live payment count=1 and live course access count=1 at verification.

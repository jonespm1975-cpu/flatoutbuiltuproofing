# Flat Out Built-Up Roofing — verified read-only audit, 23 November 2026

Scope: connected GitHub repository, Supabase project fhyhshakmvqwzdyannec, and live Stripe account. No charge, webhook replay, mail send, secrets change, deployment or site-style change was made.

## Verified
- GitHub repository jonespm1975-cpu/flatoutbuiltuproofing is accessible, with main as default branch; AGENTS.md explicitly protects the approved main page design.
- Supabase project reports ACTIVE_HEALTHY and health advisor returned no findings.
- Supabase public/internal tables include protected course access, purchase confirmation, membership and analytics tables; advisor reports nine RLS-enabled/no-policy INFO notices requiring intentional-deny review.
- One security-definer RPC, public.outstanding_course_orders(boolean), is executable by authenticated users, not anon. Its implementation checks auth.uid(), restricts owner_view to the owner, and filters non-owner rows to caller. Do not blindly revoke: customers may rely on their own status lookup. Further role-specific testing is needed.
- Leaked-password protection is disabled per Supabase security advisor. Enable through Supabase Auth settings if the plan supports it.
- Current live Stripe account is connected, and one live webhook endpoint is enabled for checkout.session.completed and checkout.session.async_payment_succeeded, targeting the current stripe-webhook Edge Function.
- Live Stripe prices: £9.99 one-time (inclusive tax behavior), £5/month recurring for future membership (inclusive tax behavior), and an older £1.99/month recurring price. Existing subscriptions must not be changed automatically.
- A verified live £9.99 Stripe Checkout payment exists with checkout.session.completed event; Supabase purchase confirmation dated 2026-11-21 13:17 UTC matches the live course entitlement by session and account. Live email outbox shows accepted for that purchase. Provider acceptance alone does not prove inbox delivery.
- The active stripe-webhook source validates signature, GBP amount, UK shipping address, metadata and actual Stripe line-item price, then inserts a receipt. The purchase-confirmations trigger and email worker manage queue/access separately. This code path is not the same as proving all failure/retry cases.
- The live-purchase-email-delivery-worker source still explicitly uses api.resend.com. Owner instructed on 23 Nov never to use Resend again; do not activate worker or send email until replaced and approved. Current worker environment flag values cannot be read from these connector tools.
- GitHub purchase-info.html contains explicit terms, immediate-supply and cancellation consent fields. purchase-checkout.js enables the button on page load and invokes stripe-live-checkout only for signed-in users.
- site-analytics function has owner-authenticated GET access, opt-in page-event POST and attribution / conversion-funnel calculations; table contained 238 rows when inspected. A functional browser test is still needed.

## Still to do
1. Confirm and keep Resend-based worker disabled; design and approve a non-Resend sender with durable confirmations before enabling mail jobs.
2. Verify inbox receipt/durable contract confirmation for the live purchase without resending.
3. Verify live checkout/unlock/email worker environment flags in protected Supabase UI; do not infer settings from active deployments.
4. Run signed sandbox event, duplicate and failure-path checks, true two-connection concurrency tests, and real browser paid-content access test (no further live charge).
5. Enable leaked-password protection if supported; consider stricter definer-RPC role grants only after testing customer workflow.
6. Verify £5 membership is held closed until cancellation and access tests pass, separate from £9.99 purchases.
7. Browser/mobile test all four roofs, hero videos, tabs, sponsor gallery, analytics layout and owner music controls. Preserve design lock.
8. Check legal, UK checkout/VAT and a durable-medium cancellation confirmation with qualified review.

Status: AUDIT ONLY. Not a certification of production launch readiness.

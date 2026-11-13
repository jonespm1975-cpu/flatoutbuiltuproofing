# Legal, fulfilment and Resend launch gate — 2026-11-13

## Completed
- Staged terms and refunds wording for Stripe as payment processor, seller not VAT registered, £1.99 cancel-anytime membership access to end of current paid billing period, separately purchased lessons.
- Staged authenticated checkout page with explicit client launch hold. Production main unchanged.
- Inspected deployed `paid-lesson-content` v16: authenticates bearer JWT and checks `course_access` matching user ID, `beginner-training-course`, and `stripe_checkout_session_id LIKE 'cs_live_%'`. A sandbox payment cannot unlock this production lesson by design.
- Read-only Supabase receipt counts: sandbox 1, live 0, sandbox marked sent 1. Course-access rows count 2; no claims about their owners or entitlements.
- Inspected deployed `stripe-test-webhook` v25: direct Resend POST and status sent without storing provider response ID. Sandbox queue accepted, attempts 0, provider ID absent. Resend provider delivery NOT verified.

## Not completed / release blockers
- Genuine no-charge end-to-end sandbox checkout + entitlement test with authenticated test account, including verified Stripe event and access test; cannot substitute a live-only content endpoint for sandbox entitlement verification.
- Production legal publication: privacy retention schedules, data processors/transfers, cookie inventory, age and marketing arrangements, plus terms digital compatibility and durable confirmation still need fact verification and review.
- Resend event reconciliation via provider-side access; do not resend ambiguous historical event.
- Two independent concurrent PostgreSQL sessions in disposable database; not achieved.
- Do not enable live Stripe flag or membership product until release tests pass.

## Safety
No customer charges, emails, new sessions, entitlements, live billing changes or deployments were made by this audit.

# Proposed £9.99 payment/email separation — engineering and UK consumer-rights release gate
Date: 21 November 2026
Status: **ISOLATED TESTS PASS; NOT SAFE TO DEPLOY YET**

This is a working **technical proposal**, not a live product change or a legal determination.

## Verified test evidence

**GitHub Actions**: [run 44932485242](https://github.com/jonespm1975-cpu/flatoutbuiltuproofing/actions/runs/44932485242)
- 12/12 candidate SQL scenarios passed against disposable PostgreSQL 16, including **two true concurrent database transactions**.
- 12/12 simulated Stripe webhook acceptance/rejection scenarios passed using offline TypeScript mocks.
- No Stripe API calls, email delivery, production Supabase writes or real charges occurred.
- Proposed API and SQL are in `proposals/stripe-webhook-decoupled-NOT-DEPLOYED.ts` and `proposals/live-payment-email-decoupling-NOT-DEPLOYED.sql`. These are **NOT** in the deployment path.
- Existing deployed Supabase functions remain unchanged. Current production course entitlement is **still tied to Resend acceptance** and this is still a production defect until approved cutover.

## What the candidate changes technically

1. The existing Stripe webhook checks signature, event type, paid status, live mode, exact £9.99 approved Stripe price, customer mapping, all checkout consent fields and GB shipping address.
2. After those checks, it calls the service-role-only `record_verified_live_course_purchase` RPC.
3. That RPC uses one PostgreSQL transaction to upsert the immutable buyer order, grant a single course entitlement, and queue a separate email-outbox job. Duplicate events are idempotent. Conflicting signed-event details cause rollback.
4. `finish_live_purchase_email_retry` continues to perform lease-checked email status/backoff/attempt bookkeeping but **does not grant or revoke course access**.
5. The existing Resend worker keeps the stable idempotency key and mail retries. The £1.99 monthly membership remains separate and disabled.

## UK durable-contract compliance — BLOCKING release gate

The current law includes:
- [Consumer Contracts Regulations 2013, regulation 16](https://www.legislation.gov.uk/uksi/2013/3134/regulation/16): provide contract confirmation on a durable medium, including recorded digital-content consent and acknowledgement.
- [Consumer Contracts Regulations 2013, regulation 37](https://www.legislation.gov.uk/uksi/2013/3134/regulation/37): consent/acknowledgement and the effect of a missing durable confirmation on cancellation rights.

**Critical caution**: The isolated technical fix can grant lesson access before a provider accepts the confirmation email. It does **not** establish that a durable contract confirmation was actually given. Do not deploy that behaviour until a qualified UK consumer-law review assesses the timing, medium, content and cancellation/refund wording. In particular, do not mark a consumer's cooling-off right as forfeited if the legally required confirmation has not been provided. The existing printable `purchase-confirmations.html` page should **not** be assumed by itself to satisfy durable-medium requirements.

Possible engineering delivery options for legal review:
- Keep transactional email with immutable terms/refunds attachments, plus an alternative approved durable-medium handoff that customers can retain permanently (e.g. a buyer-specific immutable document offered as an actual download, rather than merely a mutable website page).
- Store `confirmation_provided_at`, `confirmation_delivery_method`, `contract_snapshot_version` and immutable hash/version evidence separately from `provider_accepted_at` and `email_delivered_at`.
- Preserve a consumer's cancellation/refund rights where confirmation was not provided; do not allow a technical “lesson unlocked” state to automatically waive consumer rights.
- Use a safe manual owner recovery path for any paid order whose contract notice has not been provided, rather than leaving it forever locked after five email failures.

**Do not equate these states**: verified payment; course entitlement; performance/supply started; confirmation made available on durable medium; email provider accepted; email ultimately delivered; customer cancellation right status.

## Additional required tests before release

- End-to-end verification of the final legally reviewed durable confirmation delivered to a buyer (and recorded, not just queued).
- Signed Stripe webhook replay and real Stripe *sandbox* source (not only a mocked event); user/price/country/refund, queued email outage, duplicate/out-of-order.
- Test a real worker-provider timeout/ambiguous acceptance, retry idempotency window, bounce and recovery; no duplicate email.
- Confirm secure RLS, protected lesson response and that purchased courses and £1.99 memberships remain separately gated.
- Reconcile one existing paid live owner purchase and any prior entitlement records; dry-run migration and rollback plan.
- Explicit owner approval for any production deployment. Keep the approved homepage untouched and Supabase on Free.

**Outcome**: The technical design defect is addressed and independently tested **in isolation**, but production is not corrected. The external Stripe legacy API request and final Resend delivery checks are separately tracked in [issue #9](https://github.com/jonespm1975-cpu/flatoutbuiltuproofing/issues/9).

# Task 25 — UK-only launch, live checkout gate, and purchase-email path
Checked: 2026-11-14
Scope: UK-only launch. No charge, Checkout Session, email, or live setting was created or changed during this audit.

## Verified live checkout gate
- Public purchase page: https://flatoutbuiltuproofing.co.uk/purchase-info.html
- Live page renders “Purchases are not open yet”; the consent checkbox and checkout button are disabled.
- Stripe live account read-only check: no active Payment Links returned.
- Retrieved the live £9.99 Payment Link associated with prior sessions: `active=false`, `automatic_tax.enabled=true`, `shipping_address_collection=null`, and no country restrictions configured.
- Read-only list returned 14 live Checkout Sessions; every returned session was expired and unpaid. No paid session was present in this returned list.
- Supabase `stripe-live-checkout` is ACTIVE v12. Source checks `STRIPE_LIVE_CHECKOUT_ENABLED === "true"` and then authenticates the customer before it can call Stripe to create a Checkout Session. Its effective runtime secret value is not accessible through the connected Supabase tools, so the secret’s value is not independently verified.
- The public purchase page and inactive payment link provide direct evidence that the current customer-facing checkout is closed. Do not interpret this as proof that the Edge Function runtime flag is false.
- Current checkout function source has no UK country allowlist. The retrieved Payment Link also has no UK country restriction configured. The UK-only requirement is therefore not yet enforced if checkout is enabled.

## Email-path verification
- Supabase `stripe-webhook` v31 validates signed live events, checks paid amount/currency/consent and maps the customer, then grants course access and records a purchase confirmation. It calls Resend inline afterward. A Resend configuration or delivery error returns HTTP 503 after access and the receipt are written.
- A durable live-purchase outbox trigger and service-role-only claim/finish database functions exist. Their eligibility checks limit the queue to valid pending live £9.99 receipts. Current read-only counts: zero live receipts and zero live outbox rows.
- `live-purchase-email-delivery-worker` v1 was previously audited. Current Supabase read-back shows v2 ACTIVE. It requires a valid cron token and two runtime switches before claiming or sending. Its disabled path performs no queue or email operations. The connected tools cannot read effective Edge Function secret values, invoke the worker over HTTP, or configure its schedule.
- Current `purchase-email-retry-worker` v10 is ACTIVE in sandbox and explicitly reports `sending_enabled=false`, `claiming_enabled=false`, and `scheduler_enabled=false`; it only reads queue and receipt status. It returns no email tokens and performs no claims or sends.
- No production receipt exists to test the owner confirmation email end to end. No email was sent in this audit. Provider API acceptance would still need to be distinguished from recipient delivery.

## Remaining launch blockers
1. Implement the UK-only restriction for both hosted checkout and the live Edge Function, then verify its behavior in a controlled test before enabling checkout. Current Payment Link settings and function source do not enforce UK-only eligibility.
2. Complete secure invocation of the email worker: verify Resend sender/key, configure a secure scheduler or equivalent invocation, and independently check provider and recipient delivery status. Do not place secrets in source control or chat.
3. Resolve the webhook/email coupling before launch so a Resend failure does not cause Stripe to retry already-granted fulfilment without an independently verified idempotent email path.
4. Verify the effective live checkout and course-unlock switches through an authorized secrets readback, without exposing values.
5. Run a controlled owner-only end-to-end paid test only after the owner approves the test transaction and email recipient, then reconcile Stripe, Supabase entitlement/receipt/outbox, and Resend delivery.
6. Stripe Radar rules cannot be reviewed or changed through the connected Stripe API tools used in this check. No Radar rule was changed.

## Actions taken
- Re-read current deployed Supabase function source and deployment versions for the live checkout and email workers, checked current project status and security/health advisories, and reviewed Stripe/Supabase capabilities.
- No live payments, payment settings, Edge Function secrets, customer entitlements, emails, database records, or website source were changed.

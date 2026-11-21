# Critical Stripe, receipt and access audit — 21 November 2026

**Status:** evidence recorded; two external confirmations and one payment-access design correction outstanding. **Review branch only.** No production deployment, payment, email, webhook replay, Stripe setting, Supabase project/plan, or homepage change is authorized by this report.

## Accounts and working live transaction

- Connected Stripe LIVE account: **connected live account**; test account: **connected separate test account** (separate).
- Confirmed live one-off £9.99 Checkout Session: `cs_live_[redacted]`, `complete`, `paid`, `payment`, GBP 999, country GB. One matching line item for the configured one-time £9.99 price with quantity 1.
- Supabase project `fhyhshakmvqwzdyannec` ACTIVE_HEALTHY. Current deployed functions: `stripe-live-checkout` v17, `stripe-webhook` v38 and `live-purchase-email-delivery-worker` v7.
- On 21 November the actual edge logs recorded live checkout HTTP 200 at 13:16 UTC, Stripe webhook HTTP 200 at 13:17 UTC and scheduled worker HTTP 200 at 13:20 UTC.
- Production DB contains one matching `cs_live_` purchase confirmation and one matching `course_access` row. Confirmation email is marked `sent`. Internal outbox status is `accepted`, attempts=1, with provider message ID a stored provider message ID (redacted in this public repository) and null last_error. No other live outbox rows remain pending/leased/failed.
- The active cron job `fobur-live-purchase-email-worker` runs every five minutes; function-edge logs show regular HTTP 200 responses.
- Stripe returned **zero live subscriptions**. £1.99 recurring membership remains a separate, non-launched system. Do not repurpose the £9.99 webhook or price.
- Provider **acceptance is not independent proof of final delivery**. The existing `PAYMENT_LAUNCH_AUDIT.md` records the owner's inbox confirmation, but connected tools have not retrieved the Resend message's final status.

## Stripe legacy API integration warning

- Stripe emailed the owner at 17:15 UTC on 21 November, subject `[Action required] Update your integration`, identifying a request that attempted **legacy Charges API with a token or Customers API with a token / inline source**.
- The checked live Supabase function code uses `stripe.checkout.sessions.create`, `stripe.checkout.sessions.listLineItems`, and signature verification; no legacy Charges or token-backed Customers calls were found in the examined source. GitHub code search for `stripe.charges.create` and `stripe.customers.create` returned no matches.
- A new repository source regression check accompanies this audit, but it cannot inspect third-party integrations or historical deployed code. It cannot prove which client generated Stripe's warning.
- **External confirmation required:** in the correct live account, inspect Stripe Workbench request logs around the warning, record failing HTTP method/path, request ID, API key identifier/client, timestamp, response code and source integration. Do not enable deprecated API policies as a workaround. Do not change the working Checkout flow without a pinpointed cause.

## Verified course-access dependency and remediation gate

Current production `public.finish_live_purchase_email_retry(...)` uses:
```sql
if p_accepted and purchase_terms = '2026-11-21-course-v1'
   and purchase_course = 'beginner-training-course' then
  insert into public.course_access ...
end if;
```
Consequently, if Resend remains unavailable, a valid paid order can be recorded and queued without granting access. This failure path was **not exercised** by the successful owner payment.

A naive unconditional unlock on purchase INSERT may conflict with requirements for providing a durable contract confirmation and recording immediate digital-content consent. Review UK **Consumer Contracts Regulations 2013**, regulations [16](https://www.legislation.gov.uk/uksi/2013/3134/regulation/16) and [37](https://www.legislation.gov.uk/uksi/2013/3134/regulation/37), before cutover.

**Proposed acceptance-tested design (not deployed):**
1. Accept only an appropriately signed and fully validated paid live Checkout event, correct course/price/currency/customer/GB eligibility and recorded express consent.
2. Persist the order, its immutable downloadable contract terms/cancellation snapshot and confirmation of consent in a buyer-only durable format; confirm the legally required delivery step is satisfied before granting paid content.
3. Grant course entitlement transactionally from the verified order plus confirmed durable-notice state, **without depending on external Resend provider acceptance**. Keep the member's paid access distinct from subscription access.
4. Queue email independently with the existing signed worker token, claim/finish lease and stable Resend idempotency key. Keep provider acceptance, final delivery/bounce status and entitlement as separate facts. A mail outage must not cause duplicate payment or duplicate lesson unlock.
5. Test in an isolated environment: valid/invalid/duplicate/out-of-order webhook, unpaid/GB-mismatch/wrong-user order, email outage/timeouts/retry, durable-confirmation failure, repeated concurrent workers, existing test-entitlement replacement and owner recovery, including actual two-connection transactions.
6. Reconcile historical valid purchases before any cutover; deploy only after tests, rollback plan and legal review. **Do not apply an untested SQL migration directly to production**.

## Security notes

Supabase Security Advisor: `auth_leaked_password_protection` disabled. Nine tables have RLS enabled without policies. Read-only role-grant inspection found `course_access` grants authenticated SELECT; the purchase-confirmation and email-outbox tables are not granted directly to `anon` / `authenticated`. Review each table's intended server-only use; do **not** add public policies merely to silence INFO lint.

## Safe next checks

1. Identify Stripe Workbench request responsible for the warning.
2. Look up the exact Resend email message ID's final Delivered/Bounced/Failed status; **do not resend an accepted message**.
3. Implement, isolate and test the legal/technical access and durable-confirmation redesign before production.
4. Finish Supabase Auth leaked-password review if supported on the owner's Free plan; recheck database advisor results.
5. Preserve the approved homepage, free Supabase plan, existing successful £9.99 course access, and dormant separate £1.99 subscription configuration.

*Evidence gathered by read-only connector calls on 21 November 2026. No claim of a completed payment-failure or two-connection concurrency test is made.*

# Phase 2 — Future-only durable course confirmations (STAGED / NOT LIVE)
23 November 2026 · Flat Out Built-Up Roofing · owner review required

## State / absolute safety rules
- **No code in this PR has been deployed to production.** No new Supabase migration applied, cron job created, provider keys configured, customer messages sent or past records re-sent.
- The owner has permanently forbidden the prior email provider. Do not reconnect, access, retry, invoke or reuse it.
- Existing successful £9.99 payment, entitlement, and previously accepted historical email-outbox record remain untouched. The new trigger is **INSERT-only**, has **no historical backfill**, and the claim function also excludes old accepted rows.
- Paid-course access remains independent of email delivery, and none of these functions creates payments or grants entitlements.
- £5 membership, legacy £1.99 test subscriptions, 24 other paid courses and sponsor notifications are **out of scope**.
- Supabase stays on Free plan. Approved four-page website and homepage layout, video and imagery are unchanged.

## Implemented in this staged PR
1. `internal.future_contract_confirmation_jobs` is a new private RLS table with one row per future verified paid order, status `pending/leased/accepted/delivered/bounced/review`.
2. Only `service_role` can claim or finish jobs through tightly scoped SQL RPCs. Concurrent claims use `FOR UPDATE SKIP LOCKED` and unique session IDs.
3. At most one provider-send attempt is allowed automatically. Even an expired lease, network timeout, unknown provider result, or failure after provider acceptance **must never cause an automatic resend**. A human must reconcile the provider message ID first.
4. `future-contract-confirmation-worker` is a **proposed Postmark adapter**, gated off until explicit provider selection, verified sending domain, dedicated secret, and `FUTURE_CONFIRMATION_DELIVERY_ENABLED=true`.
5. The fixed `2026-11-21-course-v1` contract snapshots (both Terms and Cancellation/Refunds), order amount, course, buyer-account email and original consent timestamp are **embedded in the HTML and plain-text email**. They are not replaced with dynamic website links. The customer has no additional charge.
6. Postmark API acceptance is stored as `accepted`, *not* `delivered`. A separate staged Basic-authenticated provider callback records destination mail-server `delivered` or `bounced`, matched against **both the provider's MessageID and the stored email recipient**. Replays are idempotent and bounced status cannot be overwritten by a later delivery event.
7. Provider webhooks have no native HMAC signature as of this review. Use HTTP Basic authentication and verified ingress restrictions in addition to payload validation. **Do not enable the webhook without securing its network entrypoint and owner review.**

## Protected configuration required *only after owner approval*
Set through Supabase Edge Function Secrets; never commit credentials.
- `FUTURE_CONFIRMATION_DELIVERY_ENABLED=false` (stay disabled until cutover)
- `FUTURE_CONFIRMATION_PROVIDER=postmark` (candidate, **not yet approved**)
- `POSTMARK_SERVER_TOKEN` (actual server token, private; no test token in production)
- `FUTURE_CONFIRMATION_FROM` (verified sender address on flatoutbuiltuproofing.co.uk)
- `FUTURE_CONFIRMATION_WORKER_KEY` (unique long random secret; server-to-server)
- `FUTURE_CONFIRMATION_WEBHOOK_ENABLED=false` (stay disabled)
- `FUTURE_CONFIRMATION_WEBHOOK_USER` / `FUTURE_CONFIRMATION_WEBHOOK_PASSWORD` (unique Basic-auth credentials, not in public GitHub source)
- Supabase project URL and service-role key remain existing runtime-protected secrets.

### Order of activation after approval
1. Owner approves the provider and reviews any price, terms, data processing and domain verification, including DKIM/DMARC.
2. Stop new live sales or confirm the owner explicitly approves the cutover window. Never create a real £9.99 charge during testing.
3. Apply and independently verify migration in isolated sandbox first, then owner-approved production cutover. Do not backfill any old purchase.
4. Deploy the worker with own secret and **no cron**, and delivery callback with verified Basic Auth and appropriate `verify_jwt=false` only when provider access safeguards are in place.
5. Verify DNS and Postmark server/stream, then use a **non-delivering** fixture/test-token test through an isolated environment. The production worker deliberately rejects the non-delivering Postmark test token to avoid false delivery claims.
6. With explicit consent, send ONE real controlled owner-inbox test, verify event correlation, acceptance, delivery/bounce, recipient, policy contents, course access and legal review. Preserve a timestamped log of this specific test.
7. Only then set delivery flags and schedule server-only delivery using a credential stored in Supabase Vault; do not reuse the retired old worker schedule.
8. Monitor `review`, `accepted`, `delivered`, `bounced`, expired leases. Ambiguous outcomes require manual provider reconciliation rather than blind resends.
9. With all tests passing and explicit owner approval, consider unpausing live checkout. Do not enable subscriptions or new courses automatically.

## Verification
Automated workflow in this draft PR uses disposable PostgreSQL 16 with **two genuine concurrent connections** and mocked real TypeScript worker/callback sources. It asserts:
- pre-existing accepted old records do not enter the new queue;
- only qualifying new £9.99 GBP live orders enqueue;
- two concurrent workers cannot claim the same confirmation;
- provider acceptance and delivery are separate statuses;
- wrong recipient/MessageID cannot be marked delivered;
- duplicate delivery/bounce callbacks are idempotent, and bounce status persists;
- ambiguous result, expired lease, no provider, missing secret or unexpected database response cannot cause an automatic second send;
- old provider remains absent from every new function;
- no external email, customer data or real payment is used.

## Owner-dependent blockers still open
1. Select and connect a suitable **non-retired** provider (Postmark merely proposed here).
2. Configure verified domain and secrets; owner approve any actual test email.
3. Independent review of full UK Consumer Contracts Regulations 2013 reg 16 and 37 details before enabling delivery (statutory cancellation rights cannot be waived just by displaying a checkbox).
4. Join up separately staged duplicate-payment prevention PR #18 and final signed-in live buyer test; no additional payments should be created until both systems are approved.

References:
- https://www.legislation.gov.uk/uksi/2013/3134/regulation/16
- https://www.legislation.gov.uk/uksi/2013/3134/regulation/37
- https://postmarkapp.com/developer/api/email-api
- https://postmarkapp.com/developer/webhooks/webhooks-overview

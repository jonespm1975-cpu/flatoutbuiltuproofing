# Phase 2 — Postmark approved; installed but email sending inactive
23 November 2026 · Flat Out Built-Up Roofing · owner review required

## State / absolute safety rules
- The future-only queue migration and two guarded Edge Functions have now been deployed to production, but **sending and delivery callback features remain inactive**. No cron job, provider keys, customer messages or past-record resends have been made.
- The owner has approved **Postmark** and permanently forbidden the prior email provider. Do not reconnect, access, retry, invoke or reuse it.
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


## Postmark owner approval and dormant installation — 23 November 2026

**Authorisation:** owner approved Postmark as the replacement provider. No paid Postmark plan was authorised; Postmark's current free Developer plan allows up to 100 emails/month.

**Production installation now complete but safely inactive:**
- Migration `future_only_contract_confirmation_queue_20261123` applied; RLS enabled; only service_role can claim or report delivery. The new future queue contains **zero records**, no historical purchase replays, and no scheduled mail worker.
- `future-contract-confirmation-worker` v1 and `future-confirmation-delivery-webhook` v1 are installed in Supabase. The dedicated authentication keys and Postmark API token are **not** configured by the assistant. The feature-enable flags have not been activated.
- Production safe HTTP tests show POST without credentials returns 401 and GET returns 405 on both endpoints. GitHub run: https://github.com/jonespm1975-cpu/flatoutbuiltuproofing/actions/runs/45260763917 (success).
- Historical live purchase 1; matching paid course entitlement 1; old accepted email outbox 1; old cron disabled. No new emails/charges.
- Do not treat successful Edge Function deployment as successful customer email delivery.

### Exact steps in the owner-controlled accounts
1. Open https://account.postmarkapp.com/sign_up and register/login using the free Developer tier. Avoid choosing a paid plan unless separately authorised.
2. In Postmark, create a server for `Flat Out Built-Up Roofing` with transactional `outbound` messages. Add the sending domain `flatoutbuiltuproofing.co.uk`.
3. In Postmark **Sender Signatures → DNS Settings** find the exact generated DKIM TXT host/value and custom Return-Path CNAME host/value. **These are account-specific**; do not invent the DKIM value. Postmark often defaults to `pm_bounces` → `pm.mtasv.net`.
4. In https://www.names.co.uk login → Services → DNS Administration → domain → Add/Modify DNS zone, add **only** the provider-provided DKIM TXT and Return-Path CNAME, plus DMARC if appropriate. Keep all existing A/AAAA, GitHub Pages CNAME, MX, verified third-party mail and nameserver records unchanged. Do not switch your domain's nameservers.
5. Press Verify in Postmark after DNS propagation. The free tier can be used for the initial tests if permitted by the provider.
6. In Postmark Server → **API Tokens**, obtain the **Server API Token** privately. Never paste it into ChatGPT or GitHub issue/PR. Store it only inside protected Supabase secrets; same for unique worker token and webhook Basic-Auth username/password.
7. Configure the dedicated Postmark delivery/bounce webhooks using authenticated HTTPS URLs and provider documentation, but leave `FUTURE_CONFIRMATION_WEBHOOK_ENABLED` not true until authentication and ingress restrictions are checked.
8. Confirm owner test inbox and explicitly authorise the first real deliverability test. Start with a Postmark non-delivering test token in an isolated context; never mark its result as delivered. Subsequently test one real message and verify both accepted and recipient delivery, not just HTTP 200.
9. Do not set `FUTURE_CONFIRMATION_DELIVERY_ENABLED=true` or schedule the worker until tests, final legal review and checkout release gate pass. Never enable or call the retired provider.

Official references: https://postmarkapp.com/support/article/how-do-i-verify-a-domain
and https://www.names.co.uk/support/articles/accessing-your-dns-zone-files/
and https://postmarkapp.com/developer/webhooks/webhooks-overview.


## Verified public DNS audit and webhook hardening — 23 November 2026

GitHub Actions **read-only** public DNS audit run:
https://github.com/jonespm1975-cpu/flatoutbuiltuproofing/actions/runs/45261685713

| Existing DNS item | Verified public response |
| --- | --- |
| Authoritative NS | ns0.phase8.net, ns1.phase8.net, ns2.phase8.net |
| `www` CNAME | jonespm1975-cpu.github.io |
| Inbound MX | fwd0.hosts.co.uk, fwd1.hosts.co.uk, fwd2.hosts.co.uk |
| Apex SPF TXT | No `v=spf1` record published at lookup time |
| `_dmarc` TXT | Not published (DNS NXDOMAIN) |
| `pm_bounces` / `pm-bounces` CNAME | Not published (DNS NXDOMAIN) |
| Postmark DKIM TXT | **Unknown**: requires the account-generated exact hostname/record from Sender Signatures → DNS Settings |

**Important:** The existing `www` CNAME and MX records must **not** be replaced. Do not switch nameservers. Postmark does not necessarily require an apex SPF record to send DKIM-authenticated mail; any addition to the root SPF record must account for **all** legitimate outbound senders and avoid multiple `v=spf1` records. Postmark's verified DKIM and aligned custom Return-Path are the priorities.

Suggested *monitoring-only* DMARC start (owner to approve at DNS provider):
- Type: `TXT`
- Name/host: `_dmarc` (some control panels append the domain automatically)
- Value: `v=DMARC1; p=none`
- Do not add `rua` without a verified, approved reporting address or Postmark-generated reporting address.
- Later evaluate `quarantine`/`reject` only after actual mail authentication is verified for all senders.

For the Postmark Return-Path, use the **exact** hostname/value displayed inside Postmark DNS Settings. Postmark commonly uses `pm-bounces` → `pm.mtasv.net`; neither candidate label is published at this check. The full DKIM key is account-specific; never invent it.

**Webhook safety upgrade:** Deployed `future-confirmation-delivery-webhook` v2 additionally requires `FUTURE_CONFIRMATION_POSTMARK_SERVER_ID` equal to the verified account/server ID before processing any event. If missing, it fails closed (503). Postmark's documented Delivery and Bounce JSON payloads contain a `ServerID`; unrelated server IDs are ignored. The endpoint still requires Basic Authentication and the independent `FUTURE_CONFIRMATION_WEBHOOK_ENABLED=true` feature flag, which is **not enabled**. No customer messages or charges were created. Provider guidance also recommends IP allowlisting at a trusted ingress; do not trust client-supplied `x-forwarded-for` values for security decisions.

After owner adds DNS records, rerun the read-only workflow in GitHub Actions. The public checker reports publication state, **not** proof of Postmark's account-side domain verification.


## Postmark API contract and privacy-hardening check — 23 November 2026

- The **official non-delivering** Postmark test token `POSTMARK_API_TEST` was used once in isolated GitHub Actions with only reserved `example.com` fixture addresses. The real Postmark API returned **HTTP 200, ErrorCode 0**, and the expected test recipient; **no actual customer email was sent**.
- Test workflow (all four jobs passed): https://github.com/jonespm1975-cpu/flatoutbuiltuproofing/actions/runs/45266151805
- Contract message now explicitly sets `TrackOpens:false` and `TrackLinks:"None"` to avoid behavioural tracking on essential legal/purchase notices.
- The worker now requires Postmark's `To` field in a successful API response to match the authenticated course-account email. An unexpected recipient is marked **review** rather than accepted and will **not** trigger an automatic resend. Accepted-by-provider is separate from delivered-to-mail-server.
- Updated production worker to **version 2**, still inactive: no enabled delivery flag, no registered provider token, zero pending future confirmations, no new cron job. The separate delivery/bounce webhook remains guarded and inactive.
- **Important Postmark sandbox caveat:** Postmark Sandbox Servers can display `Delivered` and generate webhook deliveries **even when no real inbox receives the test email**. Never treat sandbox `Delivered` as proof of durable customer contract delivery. After domain DNS verification, a separately owner-authorised delivery to an owner-controlled **real recipient inbox** and independent inbox receipt review are mandatory.
- Postmark API response recipient and non-delivery test outcomes are grounded in https://postmarkapp.com/developer/api/email-api and https://postmarkapp.com/developer/api/overview; sandbox caveat: https://postmarkapp.com/developer/user-guide/sandbox-mode/server-sandbox-mode.

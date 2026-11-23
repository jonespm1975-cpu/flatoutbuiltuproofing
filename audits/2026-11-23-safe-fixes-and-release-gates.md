# Flat Out Built-Up Roofing — Safe technical fixes and launch gates (23 November 2026)

Scope: connected Stripe (live account acct_1UT8NBKeIprRDTKx), Supabase project fhyhshakmvqwzdyannec (Free plan) and GitHub repository. User directive: no further Resend use, preserve approved homepage/four-page design, no new live charges, no membership activation, no upgrade.

## Completed and independently verified

1. **Live Stripe payment reconciliation**: 1 successful GBP 999p one-time PaymentIntent and paid UK Checkout Session; one live Supabase purchase confirmation and one matching course entitlement; Stripe reports **zero live subscriptions**. Stripe has separate one-time GBP 999p, GBP 500/month and legacy GBP 199/month prices. No subscription or price modification was made.
2. **Payment-to-access independence**: Supabase migration `20261123181441_grant_verified_live_course_before_email_delivery` is present and its trigger is enabled. Rolled-back SQL fixtures passed: GBP 999 valid purchase grants course access while email is pending; GBP 998 invalid amount does not; duplicate receipt insert is idempotent; no QA records persisted. These do **not** replace final signed webhook/parallel-connection tests.
3. **Retired previous email service**: The `fobur-live-purchase-email-worker` cron schedule is **inactive**. Supabase `live-purchase-email-delivery-worker` v8 was replaced with a **no-send/no-claim HTTP 410** response. It no longer imports or calls the former provider. Matching worker source is committed to `supabase/functions/live-purchase-email-delivery-worker/index.ts`. Accepted historical outbox record preserved; no email sent or retried.
4. **Gallery database performance**: Supabase migration `20261123182545_index_gallery_submissions_user_id` added valid `gallery_submissions_user_id_idx`, resolving the missing-FK-index advisor finding. Migration tracked under `supabase/migrations/`.
5. **Accurate customer wording**: `members.html`, `purchase-info.html`, `courses.html` no longer imply course access waits for email. `refunds.html` no longer incorrectly describes one-off £9.99 sales as not yet begun; new 24-course and £5/month checkout remain closed. No approved homepage visual layout, hero video or tab imagery changed.
6. **GitHub Pages deployment**: deployment run 45239186424 for final customer-copy commit succeeded. A separate read-only public mobile/nav audit was running at the last check; do not claim its outcome until confirmed.
7. **Source safety scan (limited)**: inspected current auth client, owner analytics, checkout, webhook and purchase UI files; did not find embedded live Stripe secret/restricted keys, embedded service-role JWTs, or direct legacy charge/token-creation calls in these files. This is not a complete repository secret scan. The dashboard's background music on/off and volume buttons are present in source.
8. **Issue tracker**: release blockers #9, #10 and #15 updated to reflect current status, retired provider and non-Resend replacement; all intentionally remain open.

## Remaining launch blockers / human actions

- **First priority**: safe durable contract confirmation via a new *approved and connected* transactional provider, or another legally adequate, reliable delivery route. Until it works, do not assume customer's cancellation waiver is effective. The downloadable/savable purchase-confirmations page is helpful, but its existence alone is not proof that a statutory durable confirmation was delivered.
- **Payment switch state**: available Supabase connector cannot inspect or list Edge Function secret values. Owner must check `STRIPE_LIVE_CHECKOUT_ENABLED`, `COURSE_UNLOCK_ENABLED`, `LIVE_PURCHASE_EMAIL_WORKER_ENABLED` and `LIVE_PURCHASE_EMAIL_SENDING_ENABLED`. Do not change live checkout without explicit approval. Strong recommendation: keep further purchases paused until durable confirmation works.
- **External Stripe legacy warning**: Stripe's email identified a blocked deprecated Charges/Customers token-backed request. Current connected tools do not expose Workbench API request logs; owner must inspect failing request's method/path, timestamp, ID and originating API key/integration. Do not enable legacy API policies to suppress it.
- **Final tests**: actual signed mocked webhook, duplicate/unpaid/asynchronous failure paths, genuine competing PostgreSQL connections using the **new** entitlement trigger, user-level paid-lesson browser test and iPhone visual review remain unconfirmed. The latest automated public audit has not been assumed passed.
- **Legal/roofing material review**: independent sign-off of 24 specialist lessons (9 critical and 15 high-priority topics) and appropriate UK consumer cancellation/privacy/tax review remain required.
- **Supabase security**: `outstanding_course_orders(boolean)` is intentionally callable by signed-in users with owner/caller filtering; advisor still warns on SECURITY DEFINER. Nine RLS tables have no policies by design and need case-by-case permissions review before changes. Leaked-password protection is Pro-only per current Supabase documentation; user explicitly wants to stay Free, so do not upgrade.
- **Unused-index INFO warnings**: not an emergency; do not drop rarely used indexes blindly.

## Safety boundaries observed

No new charge/refund/checkout session, no email, no Stripe price or subscription write, no deployment changing approved homepage or videos, no Supabase plan upgrade, no accidental use of the retired email provider. The main purchase webhook remains deployed as before. No source changes to the other four main roofing page HTML files.


## Additional provider audit — 23 November 2026

Full scan of all **19 deployed Supabase Edge Functions** found two additional legacy email senders beyond the already retired live worker:
- `sponsor-logo-intake` v9 had a provider call after successful logo storage.
- `owner-sandbox-receipt-check` v3 was an expired provider-backed owner test.
Both have now been changed, with no emails sent:
- `sponsor-logo-intake` v10 **preserves invitation token validation, submitter authorisation, file signatures, private storage and pending owner approval**, but makes no email call. Its notification status retains database default `pending`, so the owner must review new submissions in Supabase manually.
- `owner-sandbox-receipt-check` v4 returns 404 and sends nothing.
- Re-scanned all 19 deployed functions: **zero references to the former provider's API endpoint or key**.
- Both current sources are recorded in GitHub. Root `AGENTS.md` now contains an explicit permanent no-Resend policy, and the new workflow `.github/workflows/no-retired-email-provider.yml` checks the three affected active source files for regression.
- Last Supabase verification still showed one original live payment and entitlement, one accepted historical outbox record, no pending outbox records, and inactive live-email cron.
- The provider's credentials may still exist in protected project secrets; the connector cannot list or remove them. The owner should revoke/clear them when able. Nothing was sent or re-sent.


## Final testing update — 23 November 2026, 19:02 UTC

**Automated testing completed in isolated environments:**
- Signed webhook fixture and actual migrated trigger in disposable, genuinely two-connection PostgreSQL: **both GitHub Actions jobs passed**. Run: https://github.com/jonespm1975-cpu/flatoutbuiltuproofing/actions/runs/45241958751
- Live unauthenticated endpoint refusal gates **passed** without live checkout, payment, email, credentials, or writes. Run: https://github.com/jonespm1975-cpu/flatoutbuiltuproofing/actions/runs/45242337274
- Public phone/tablet/desktop navigation and sponsor-gallery browser check passed. Run: https://github.com/jonespm1975-cpu/flatoutbuiltuproofing/actions/runs/45239173688
- Offline authenticated *mock* account flow at 390px and 1280px **passed**: paid/unpaid lesson entitlements, lesson rendering, private own receipts, printable receipt visibility, and optional analytics consent rejection. Run: https://github.com/jonespm1975-cpu/flatoutbuiltuproofing/actions/runs/45244136905
- Found and fixed a real UI bug where a hidden print button was still visually rendered for a zero-purchase account. `purchase-confirmations.html` now applies `#print[hidden]{display:none!important}`. GitHub Pages deployment for that commit passed: https://github.com/jonespm1975-cpu/flatoutbuiltuproofing/actions/runs/45244136697
- Fresh Supabase verification: one original live GBP £9.99 receipt, one matching live entitlement, **zero outstanding live receipts without access**, zero persistent QA receipt rows; retired live-email cron remains inactive.

**Critical operator warning**: Current deployed `stripe-live-checkout` function checks `STRIPE_LIVE_CHECKOUT_ENABLED` *before* authentication. A no-bearer, correct-origin test returned HTTP 401 rather than 503, strongly confirming the production checkout flag is currently `true` and live secret configuration passes basic checks. No real Checkout Session was created during this test. Email provider is retired and durable contractual confirmation delivery is unavailable: user/owner should set `STRIPE_LIVE_CHECKOUT_ENABLED=false` in protected Supabase Edge Function Secrets pending reliable alternate confirmation, or explicitly approve another safe policy. Do **not** change live flags here without separate owner authorisation.

**Still not independently verified**: authenticated real-buyer browser flow using an actual owner session, current iPhone Safari visual match against approved 22 Nov image, legally adequate *delivered* durable contract confirmation, access after a real signed Stripe event post-migration, original Stripe legacy Charges/Customers warning's originating Workbench request, and independent content/safety reviews for 24 specialist lessons. The isolated test suites do not replace these validations. No further Resend calls are permitted.


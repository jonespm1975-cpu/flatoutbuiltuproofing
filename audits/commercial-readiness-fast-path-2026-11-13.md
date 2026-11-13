# Flat Out Built-Up Roofing — fastest safe completion plan

Updated: 13 November 2026
Purpose: finish the commercial-readiness checks in dependency order, while keeping customer billing and production changes held.

## Current guardrails
- Do not create charges, send emails, replay webhook events, change live billing/settings, edit customer entitlements, alter the homepage, or upgrade Supabase.
- Keep website code changes in the GitHub review branch until all release gates pass.
- Treat Stripe `pending_webhooks=1` as an outstanding delivery, not proof of a failed response. Inspect Workbench before any retry.
- Do not backfill the three historical mismatches automatically.

## Fastest dependency order

### 1. Owner actions — start these in parallel
- [ ] Recover Stripe Workbench access with the passkey. Inspect event `evt_1Ub6xTKS41qhUQTKCAsjwHU2` and record its HTTP response. It is a TEST subscription Checkout event; the only subscribed pending endpoint is `stripe-test-webhook`. Do not retry while the current no-replay instruction stands.
- [ ] In Supabase Auth security, enable Leaked Password Protection if the setting is available on the Free plan, then verify the warning clears.
- [ ] Complete legal decisions: data-retention/deletion periods, actual processors and transfer safeguards, marketing/cookies/gallery/age policy, compatibility/accessibility/support details, and exact checkout consent wording. The connected Drive search found no FOBUR legal source files.
- [ ] Approve the final terms text/version. In `main`, terms, privacy, refunds and cookies remain marked DRAFT; privacy has unresolved owner placeholders. The purchase-information page says purchases are closed and its consent checkbox and checkout button are disabled.
- [ ] In Resend, check the existing message's provider delivery status. Gmail search found no Resend delivery notice. Do not resend while its status is unclear.

### 2. Code and database work — continue in parallel
- [ ] Keep the staged webhook change that separates purchase fulfilment from email delivery in review; live webhook v31 still calls Resend directly and can return 503 after access is recorded.
- [ ] Run actual-source provider failure/retry tests, including provider acceptance followed by database failure.
- [ ] Run claim/lease contention against two independent PostgreSQL connections. The current environment lacks `psql`, Docker and Deno; existing Node tests are contract/mock tests only.
- [ ] Keep the historical payment records unchanged while matching each Stripe session, receipt, access record and cancellation state. The £11.99 test total is explained by test tax-exclusive versus tax-inclusive checkout settings, but UK VAT compliance is not established.
- [ ] After the owner steps and isolated tests pass, complete sandbox-only checkout-to-access QA, legal-link checks, rollback review and an independent code review.
- [ ] Request current explicit go-live approval only after the release gates are closed.

## Plugin routing and current readiness

| Work | Plugin/app | Current result |
|---|---|---|
| Source, review branch, task audit and GitHub Pages | GitHub | Responding; FOBUR repository accessible. Use the review branch; do not deploy during testing. |
| Database, Auth, Edge Functions and logs | Supabase | Responding; project ACTIVE_HEALTHY. Leaked Password Protection warning remains. |
| Payment events and products | Stripe | API connector responds for live and TEST accounts. Workbench delivery history still needs passkey access. |
| Legal/source files and provider notifications | Google Drive, Gmail | Both respond. Drive search found no FOBUR project documents. Gmail can search for existing evidence; do not send mail. |
| Brand materials | Canva | Responds; no Brand Kit is available. Not a payment-release blocker. |
| Tutorial visuals | Higgsfield | Connected to the FOBUR account; use after technical and legal blockers. |
| YouTube topic/SEO work | vidIQ | Responds, but no YouTube channel is connected. Optional until content publishing. |
| Contractor/sponsor research | LinkedIn | Search responds but no exact FOBUR/Hampshire profile match was found. No outreach sent. |
| Sites hosting | Sites | Connector responds but has no Sites-managed project; the production website is on GitHub Pages. |
| Scheduled project checks | Automations | Two daily roofing tasks are already enabled. Keep them; avoid duplicating their work. |
| Provider delivery evidence | Resend | No Resend plugin appeared in the available plugin directory. Verify in Resend itself or connect a provider integration. |
| Other available tools | Documents, Spreadsheets, Library, ImageGen, Pets, hotline | Use only when the matching deliverable or task calls for them; they do not unblock payment readiness. |

## Current verified technical status
- Tasks 274–283: rollback-only purchase-function safety checks passed; no test rows remained.
- Tasks 284–293: 10 staged Node contract/mock tests passed; none exercised live Stripe or true DB contention.
- `public.fulfil_live_course_purchase_v4` exists and has restricted service-role execution. Older audit wording claiming it was absent has been corrected.
- Live course access rows: 0; sandbox course access rows: 2. Live email outbox: 0; sandbox retry queue: 1.
- Historical record exceptions remain: two course-access rows lack receipts and one sandbox receipt lacks access.

## Fast handoff
The four owner actions are passkey recovery, leaked-password setting, legal-version approval, and Resend provider-status confirmation. The assistant can continue code review and local/sandbox work while those are handled.

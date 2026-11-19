# Owner Analytics — rollout & verification
Date: 2026-11-19 (Europe/London)
Project: Flat Out Built-Up Roofing
Repository: jonespm1975-cpu/flatoutbuiltuproofing
Supabase project: fhyhshakmvqwzdyannec

## Purpose
Make section views, acquisition channels, course-interest clicks, verified account sign-ups and completed LIVE course purchases distinguishable, privacy-conscious and owner-only. Keep homepage markup/design intact and do not alter checkout configuration.

## Changes applied
- Supabase migration `consented_site_analytics_events_20261119`: `event_kind`, `source_category`, `source_detail`, `campaign`; legacy views retain NULL attribution.
- `site-analytics` Edge Function v4: fixes path validation for normal `.html` pages; requires opt-in marker and site Origin on POST; handles `page_view` and `course_interest`. GET remains owner-authorized, combines aggregate page analytics with Supabase Auth email-confirmed account totals and provider-confirmed paid live course checkouts; test checkout references are not counted.
- `site-tracking.js`: voluntary opt-in, equal-choice consent prompt, short-lived session ID only after acceptance, coarse attribution from UTM/referring host (not full URL), course-link click events, preferences available through Cookies page. GPC/DNT honoured.
- Tracking script present/added on free lesson pages, course catalogue/detail pages, gallery, sponsors, sponsor forms, related learning pages and public member/account content. The `index.html` homepage markup and imagery remain untouched.
- `owner-analytics.html`: separate training page views, consent-based course interest clicks, verified account sign-ups and confirmed live paid course purchases; QR arrivals expressly not QR scans. Section comparison deferred until all four areas (free lessons, courses, gallery, sponsors) have recorded consented visits. Historical untagged traffic not mislabelled as direct.
- `privacy.html` and `cookies.html`: notice and change-preferences control.
- Supabase `analytics_90_day_retention_schedule_20261119`: active `pg_cron` job `fobur-site-analytics-retain-90-days` at 03:15 UTC daily, deleting analytics events older than 90 days.

## Observed state at audit
- 25 page-view rows, all on `/`; no course-interest events recorded. The former endpoint rejected `.html` paths, which explains missing historical interior views.
- 1 email-confirmed non-owner Supabase Auth account. This may include a test user; real-user acquisition has not been independently established.
- 0 `cs_live_%` paid course confirmations in the database, 2 sandbox confirmations excluded from live reporting.
- Live Stripe account read-only audit: 14 Checkout Sessions returned, none marked complete or paid. No changes to live Stripe objects or billing settings.
- `site_page_events` RLS enabled; no public read policy. Reporting API verifies owner identity and email before returning data.
- Edge v4 active; GitHub main updated; JavaScript static parse checks passed. Public-site runtime delivery and an authenticated GET response were not testable from the available web environment. Do not represent these as live end-to-end tested.

## Measurement definitions and remaining checks
- Views/visitors: optional analytics only; sessions, not unique people.
- QR: only visits reaching tagged URLs with e.g. `?utm_source=qr&utm_medium=qr&utm_campaign=van_flyer`. Existing printed/embedded QR codes without campaign tags (and codes leading to email/payment apps) cannot have historical scans inferred. Reissue any QR whose visits must be compared. Compare results only after a real sample is collected.
- Search/social: categorised from opt-in acquisition metadata, not an advertising-pixel conversion system.
- Course interest: link-click signal to tracked course-detail destinations, not an enquiry or a purchase.
- Verified sign-ups: Supabase Auth email-confirmation timestamp; excludes the owner; no visitor-ID linkage.
- Completed live course purchases: recorded provider-confirmed `cs_live_%` paid course purchase confirmations; membership subscriptions and sandbox sales are deliberately separate. Reconcile future production paid Stripe checkouts against database confirmations.
- Funnel steps are independent totals rather than a user-level sequential cohort. No conversion percentage should be presented until there is a privacy-approved attribution design and adequate data.
- Next QA: load a free lesson, course page, gallery and sponsors in a genuine consenting browser; verify new events and campaign classification in the owner dashboard; test refusal/revocation; inspect report only as the owner; reconcile any new Stripe payment with confirmed purchase rows. No artificial live visits/purchases were created in this audit.

## Security note
Supabase security advisors flagged a separate existing account-password setting: leaked-password protection is disabled. This is not part of analytics rollout. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

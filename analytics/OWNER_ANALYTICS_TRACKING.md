# Owner Analytics — source attribution, coverage and conversion definitions

Updated: 19 November 2026. Scope: first-party website analytics only. **No payment or checkout settings were changed.**

## Implementation
- Public tracking: `site-tracking.js` on the homepage, `courses.html`, `free-hub.html`, all three `lessons/*.html`, `gallery.html`, `sponsors.html`, and the specialist training pages. Existing page designs and hero artwork are unchanged.
- Data endpoint: Supabase Edge Function `site-analytics` in project `fhyhshakmvqwzdyannec`.
- Store: RLS-enabled `public.site_page_events` (service-role only; no public select policies). A scheduled retention job removes events after 90 days.
- Owner report: `owner-analytics.html`. The backend verifies the owner account on every GET; the browser also checks owner access.
- The dashboard deliberately **pauses comparisons** between Free lessons, Courses, Project Gallery and Sponsors & Partners until every section has actual recorded opted-in page views. Missing visits are not interpreted as zero interest.

## Consent and privacy
- Page-view and course-interest events require an affirmative analytics choice. A refusal, Global Privacy Control or Do Not Track prevents collection. The preference can be changed from `cookies.html`.
- No raw referral URL, IP address, email, account ID, payment ID or checkout identifier is stored in analytics events. Only page path, a random per-tab session key, broad device category, coarse acquisition source, optional safe campaign code, event type and time.
- A tab's first recognised source is kept for that opted-in session; subsequent internal page navigation does not overwrite it.
- The owner report reads account and paid-purchase **aggregate counts separately**. Anonymous analytics events are not joined to identified accounts or Stripe payments.
- Historical records without source attribution stay unattributed; they are not backfilled or guessed. Only consented sessions are counted, so analytics is not a census of all site visitors.

## Attribution URL patterns
Use these examples when creating **new QR artwork or social links**. The QR image itself must encode the full tagged URL; simply linking an existing QR image to a tagged page does not change what its scan opens.

- Site flyer QR: `https://flatoutbuiltuproofing.co.uk/?utm_medium=qr&utm_source=qr_site_flyer&utm_campaign=qr_site_flyer`
- Sponsor exhibition QR: `https://flatoutbuiltuproofing.co.uk/sponsors.html?utm_medium=qr&utm_source=qr_sponsor_hall&utm_campaign=qr_sponsor_hall`
- Instagram post: `https://flatoutbuiltuproofing.co.uk/courses.html?utm_source=instagram&utm_medium=social&utm_campaign=social_instagram`
- Facebook post: `https://flatoutbuiltuproofing.co.uk/gallery.html?utm_source=facebook&utm_medium=social&utm_campaign=social_facebook`
- Organic search: typically classified from an external search-engine referrer, where available; do not assume a hidden referrer means search.

Campaign values are stored only if they use a safe lower-case prefix (`qr_`, `social_`, `search_`, `fobur_`, `sponsor_`, `course_`, `homepage_`, `site_`, `promo_`) and contain letters, numbers, hyphens or underscores. Source detail is an allowlisted provider name or generic channel label, not a raw domain or user input.

**Existing support/donation and email-enquiry QR images were not altered**. A donation QR leading to a payment provider and an email QR are not equivalent to a tagged website landing and cannot be reported as website QR arrivals without a tagged website entry point.

## Funnel and denominators
1. **Training page views**: consented page loads on Free lessons and Courses pages. A page view is not a unique person.
2. **Course-interest clicks**: consented clicks on course call-to-action links, not ordinary menu navigation. Also report distinct interested tab sessions. This is interest, not a checkout or purchase.
3. **Registrations / verified sign-ups**: non-anonymous Supabase Auth users excluding the owner, created in the selected date window; verified sign-ups are the subset with confirmed email as of report time. These are server-side account counts and can include test registrations unless separately identified.
4. **Completed live course purchases**: paid `purchase_confirmations` records with a `cs_live_` Stripe checkout session and positive paid amount, confirmed in the selected date window. Test sessions (`cs_test_`) are excluded. Refunds and membership subscription charges are not included in this course-purchase count.

The four stages have **different denominators and cannot be divided into a user-level conversion rate**. A true cohort funnel would require separately designed, consent-aware linking and validation, which is not implemented.

Acquisition breakdown uses distinct opted-in tab sessions by first-touch channel. **QR versus Search versus Social comparisons are paused until all three have at least one attributed consented session.** QR campaigns count distinct tagged sessions, **not physical scans**. The coverage note reports known-source, unknown and pre-attribution page-view counts.

## Checks performed
- Inspected GitHub tracker imports across homepage, course catalogue, free lessons, gallery, sponsor hall, specialist lessons and other training pages.
- Inspected the Supabase analytics table, service-only RLS policies, scheduled 90-day retention job, and the deployed `site-analytics` function.
- Simulated browser events without network writes: QR, Instagram, Google, Facebook referrer, consent refusal, course CTA, menu navigation and first-touch persistence.
- Confirmed no synthetic analytics events or live charges were created for testing.
- Remaining real-world acceptance test: after GitHub Pages deployment, visit each core section from a browser that has opted in; use new tagged QR and social links and then verify the owner dashboard after a refresh. A full owner-authenticated GET test was not performed from this session.

## Data interpretation warnings
- A missing source is not assigned to Direct.
- Page-view comparison is blocked until all four core sections have consented observations.
- Do not compare campaign performance until each QR image actually encodes its tagged landing URL and a meaningful sample has accumulated.
- Some older site views lack source attribution and cannot be reconstructed.

# Four-category roofing site — staging readiness (21 November 2026)

Branch: `staging/four-roofing-pages-5-membership` — **do not merge until acceptance tests pass**.

## Approved presentation
- Preserve the existing live `index.html` and approved Built-Up Roofing hero entirely until explicit publish approval.
- Use four linked roof-category tabs: Built-Up Roofing (gold), Tile & Slate Roofing (ruby/slate), Metal & Sheet Roofing (silver), Liquid Applied Roofing Systems (baby blue).
- Retain the user's original visual design; original preview art is not equivalent to semantic buttons or complete lessons.
- Preserve the separate £9.99 one-off course-purchase model. Proposed membership displays £5/month in staging only; do not change existing £1.99 Stripe subscriptions automatically.

## Verified blockers
1. Main `courses.html` currently describes **Roof Inspection and Planning** as the available £9.99 written lesson. Other specialisms are planned or not for sale.
2. Prototype lists 24 specialist course topics, but no evidence yet connects all 24 individual course IDs to checkout entitlements and protected content. All 24 must remain preview-only until real content and entitlement tests are complete.
3. Confirm Stripe product/price mapping and recurring price migration policy separately; membership and individual course access are distinct.
4. Supabase public tables include `course_access`, `lesson_access`, `membership_subscriptions` and checkout reservations. Audit RLS and server-side authorisation without exposing secret keys.
5. Supabase security advisor reports leaked-password protection disabled; enable through Auth security configuration after reviewing impact.
6. Finish UK-only checkout enforcement, digital-content consent, terms, privacy, refunds and cancellation copy; verify exact live terms.
7. Demonstrate payment -> webhook -> entitlement -> confirmation email in sandbox, idempotency, cancellation, non-purchase denial and concurrency.
8. Verify videos on iOS Safari and Android, support reduced motion, keyboard navigation and poster fallback.
9. Ensure owner-only management access, uploads moderation and analytics data minimisation.

## Release gates
- No changes to `main` or live billing from staging.
- No course displayed as purchasable without a real protected lesson, correct one-off price, and tested purchase/entitlement path.
- Review all UK technical installation teaching against current manufacturer documents, project specifications, competency and applicable HSE guidance.
- QA screenshots: four page/tab states at 390px and desktop, navigation, real video playback, course catalogue crosslinks, auth and errors.
- Owner approval then reviewed PR, revert plan and smoke test.

This file records planned and verified boundaries; it is not a claim that the checks have passed.

# Protected 24-lesson import — owner-approved draft

## Verified source package (held outside public GitHub)
The private review package `Flat-Out-24-Private-Lesson-Import-DRAFT.zip` contains 24 individual `lessons/<course_id>.json` files plus an SHA-256 manifest. All file hashes were checked against the source. Source is the original owner's `Flat-Out-24-Lesson-Editorial-Review.json` created 21 November 2026.

Every lesson remains **owner-draft-approved but technically unverified**; none should be published, sold, or delivered as a complete accredited course yet.

## Existing project checks (read-only)
On Supabase project `fhyhshakmvqwzdyannec`, `paid-course-media`, `member-gallery` and `sponsor-logos` are private buckets, but none supports private JSON course bodies using current accepted MIME settings. No new bucket has been created and no policy changed.

## Proposed protected delivery
1. Review `fulfilment/private-bucket-proposal.sql` and create a dedicated **private**, `application/json`-only storage bucket in a separate sandbox first. Do NOT add a public SELECT policy or signed-URL distribution.
2. Import all 24 individual JSON files directly into `paid-lessons-private/lessons/<course_id>.json` with a service-role client from a trusted operator environment. Use the manifest SHA-256 for integrity, no overwrites without explicit review.
3. The separately staged `paid-24-course-content` endpoint checks the verified Supabase user, current-user RLS `course_access` entitlement, test-mode session, independent operator release flag, and technical-release markers, **before** reading private storage and returning only that user's purchased course.
4. Every imported draft has `content_stage: draft_for_qualified_review`. It is **deliberately rejected** by the content validator even when the release flag is set. Technical reviewers must approve each lesson first and the operator must issue explicit launch approval.
5. Keep production flag `COURSE_24_PROTECTED_LESSONS_ENABLED` disabled. `COURSE_24_TECHNICAL_RELEASE_ENABLED` must also remain disabled.
6. Before launch, test real sandbox payment, authenticated ownership, direct-link denial, refunded/revoked entitlements, signed Stripe event and email receipt, with existing beginner course untouched.

## Scope and unresolved items
- This stage prepares the private storage contract. It does NOT deploy a bucket, paid content, Edge Functions or security policy.
- The detailed illustrations in the review preview are conceptual diagrams, not manufacturer-certified construction drawings.
- This public repository contains code and documentation only. Full lesson bodies stay in the owner's downloadable package.

# Flat Out Built-Up Roofing — gallery, sponsor intake and visual refresh

**Date:** 15 November 2026  
**Scope:** Interior website content and visual improvements. The approved homepage is preserved.

## Published website work

- Rebuilt `gallery.html` as a moderated member showcase. Submissions require an authenticated account with an active live £1.99 monthly membership; one JPEG, PNG or WebP image (maximum 5 MiB) and a description up to 280 characters are accepted. A server-side check enforces membership and a limit of three pending entries per member. New entries remain private until owner approval.
- Rebuilt `sponsors.html` as a premium supplier and sponsor directory with clear commercial-disclosure and logo-permission rules.
- Added `sponsor-logo-submit.html`, an invite-token form for one company logo (JPEG, PNG or WebP, maximum 3 MiB), company contact details and a short factual description. Submissions are stored privately for owner review; the invite does not allow public publishing.
- Added generated illustrative rooftop and roofing-material artwork to the shared interior design. The images are not represented as verified customer projects. Gallery entries remain empty until real, permission-cleared project photos are approved.
- Updated sign-in return handling so members can come back to the gallery after logging in.

## Supabase infrastructure

- Applied migration `member_gallery_submissions`: private gallery submission records, row-level security, no client table grants, and private `member-gallery` bucket.
- Deployed Edge Function `member-gallery` v1 (ACTIVE). It checks the signed-in identity and calls the live membership RPC before accepting a file. Public reads expose only owner-approved entries via one-hour signed URLs.
- Applied migration `sponsor_logo_intake`: private invitation-hash and logo submission tables, row-level security, no client table grants, and private `sponsor-logos` bucket.
- Deployed Edge Function `sponsor-logo-intake` v2 (ACTIVE). It verifies the private invite hash, checks image MIME and file signatures, limits file size, stores files privately and queues them for manual review.
- Read-only verification found both buckets private with their intended MIME and size limits; both submission tables are empty; one sponsor invite is active. No test uploads were created.

## Sponsor QR handout

The sponsor invitation QR is provided separately as a private handout. Keep it within sponsor contacts: it is a bearer invitation. If someone forwards it, that person can submit a logo, but cannot approve or publish a listing.

## Homepage and launch boundaries

- `index.html` SHA remains `35749f65aaa9ba4d2a56fce050d1f8ab48385060`; homepage artwork was not changed.
- No customer payment, email, live Stripe setting, subscription or membership entitlement was modified.
- Prior launch checks still list unresolved commercial items: legal pages remain drafts with unknown policy details; live checkout/tax configuration is not fully verified; the owner receipt delivery path remains unverified. No launch-readiness claim is made from this content and design update.
- No verified sponsor logos or contractor project photographs were supplied, so none were invented or published.

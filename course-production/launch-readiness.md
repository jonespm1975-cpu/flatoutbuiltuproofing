# Flat Out Built-Up Roofing — Launch Readiness
Updated 2026-11-11. This is an internal checklist, not a claim of legal compliance.

## Completed and committed to GitHub
- Black-and-gold homepage and existing course catalogue preserved.
- Tapered Insulation Masterclass: eight educational modules, illustrative diagrams, stage animation, falls calculator and assessment.
- Video Academy page with five lesson storyboards, explicitly marked as not-yet-produced videos.
- Five original interactive browser-based animated lessons, linked from both academy pages.
- Video scripts and storyboards for five narrated lessons.
- Existing free tools safety guide retained.

## Requires technical production and review
- Film or generate real playable narrated instructional videos; add UK-English voiceover, subtitles and transcripts.
- Ensure any AI animation is clearly identified as simulation, not actual installation footage.
- Obtain written technical review of board layout, wind uplift, fixings, fire, VCL, drainage, thermal and condensation content against current UK guidance and manufacturer instructions.
- Confirm image/video licences and permissions.
- Test all mobile accessibility, controls, links and lesson content on real devices.

## Payment and customer access: NOT READY TO DECLARE COMPLETE
- Resolve Resend SPF verification and retry signed Stripe sandbox webhook; confirm durable purchase email marked sent.
- Verify Stripe live webhook signature, price/product mapping, course entitlement and repeat-event idempotency.
- Confirm authenticated buyers get the correct tapered course only after verified payment.
- Confirm legal disclosures, express digital-delivery consent, cancellation wording and receipts.
- Keep new sales disabled until the end-to-end process and UK legal review are complete.
- The 50p/week subscription is a concept only; do not create or activate recurring charges without user approval and tested cancellation.

## Security and quality
- Review Supabase row-level security and Auth settings, including leaked-password protection.
- Validate protected lesson endpoints and absence of paid content in public GitHub Pages files.
- Confirm GDPR/privacy, cookies and legal pages are accurate for actual data processing.
- Ensure backup and rollback plan before activating payment paths.

## Deliberately not changed
- No DNS or Resend records changed.
- No Stripe live payment activation, subscription creation or card charges.
- No unreviewed claims of certified instruction or guaranteed compliance.

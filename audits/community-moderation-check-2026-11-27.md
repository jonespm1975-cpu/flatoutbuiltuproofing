# Community moderation check — 27 November 2026

Read-only checks against the existing Supabase project; no public test posts or reports created.

- Database text filter accepted ordinary roofing text and rejected a profanity sample and an embedded HTTPS URL.
- Insert policies require an authenticated non-anonymous account; author and reporter identity default to the authenticated user.
- External links default to unapproved; public read policy hides linked posts pending owner approval. Only the owner can approve.
- Column grants limit user insert fields; moderation approval is not an insertable field.
- Post deletion policy permits the author or owner; report review and dismissal are owner-only.
- Reply relationships and duplicate-report prevention are configured through foreign keys and a composite primary key.
- Direct image uploads are not part of the current chat; external destinations require manual owner review. This is not automated image classification.

Remaining: actual two-account browser posting, reply, reporting, moderation and removal checks; verify on mobile and desktop. Configuration inspection is not equivalent to an end-to-end pass. No design, payment or NFRC release controls changed.

# Homepage design lock

The owner has explicitly locked the approved mobile Main Page 1 design shown in the 22 November 2026 reference photo.

- Preserve its layout, roofing tabs, colors, logo treatment, hero image/video, cards, copy styling, spacing, and section arrangement.
- Do not make any visual redesign or styling change without the owner's explicit confirmation of that specific change.
- A general request to “fix,” “resolve,” or improve something does not authorize a change to the locked appearance.
- Functional fixes may proceed only when they preserve the approved visual design. If a fix would alter the appearance, pause and ask the owner for explicit confirmation first.
- Do not remove or replace the mobile reference artwork or its real navigation links unless explicitly confirmed.
- Keep the photo's phone/browser chrome outside the website page; the website provides the page content, while the browser provides its own status/address bars.

Reference: Library file “IMG_2073(2).jpeg” (libfile_f76ec751e1f08191bdb8376c0ffbc874). Live Main Page 1: https://flatoutbuiltuproofing.co.uk/built-up-roofing.html#roof-panel-1.


# No-Resend provider lock — 23 November 2026

The owner explicitly instructed that Resend must **never** be used again for this project. This is not permission to revisit or reconnect that provider.

- Do not call Resend APIs, send or retry mail through it, re-enable Resend cron schedules, reintroduce Resend SDKs, use its keys, or deploy any code that calls its endpoints.
- The original live purchase email worker, sandbox receipt checker, and sponsor notification sender have been retired or stripped of sending behaviour. All 19 deployed Supabase Edge Functions were checked on 23 November 2026: no active source file retained a Resend API call or API-key reference.
- Sponsor logo submissions remain privately stored and pending owner approval; there is no automatic owner email until a separately approved alternative is installed.
- Keep email delivery separate from signed Stripe webhook payment verification and paid-course entitlement. Customer access must not depend on mail acceptance.
- A different transactional email service requires owner selection, secure configuration, consent/legal review and sandbox tests before activation.
- Do not issue live charges or alter live Stripe payment and membership switches without explicit approval; keep Supabase on the Free plan.

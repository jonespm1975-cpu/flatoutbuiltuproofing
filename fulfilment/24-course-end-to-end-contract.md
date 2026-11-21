# 24-course fulfilment contract — staging only

## Verified existing behaviour (read-only Supabase / Stripe)
- Existing live checkout sends one `beginner-training-course` course ID and one £9.99 price ID.
- Existing live Stripe webhook verifies paid GBP 999, a single specific live Price ID, signed event, UK-collected address and required consent. It records `purchase_confirmations` and queues mail.
- Existing live email worker checks `course_id === beginner-training-course` and uses the fixed beginner lesson title. `finish_live_purchase_email_retry` grants the course only on successful provider acceptance and for that same course.
- Existing protected `paid-lesson-content` endpoint only returns the beginner lesson.
- Sandbox reservation functions check the literal `beginner-training-course`; these are not generic yet.
- Live Stripe currently exposes one active £9.99 course price (plus a second legacy active £9.99 price on that product), and an active £1.99 monthly price. No 24-course price mapping exists.

## Intended mapping (server-controlled, not customer-controlled)
Each planned course must have:
1. `course_id`: exactly one of the 24 immutable slugs in `course-catalogue.v1.json`.
2. `stripe_price_id_test` and `stripe_price_id_live`: unique verified Stripe Price IDs for the specific one-off course; £9.99 inclusive-of-applicable-tax setting subject to actual tax setup.
3. `published` and `content_verified` flags; no checkout until both true.
4. Protected lesson content and title; website card and receipt must use the same server-side title.
5. Entitlement key `(user_id, course_id)`, never one shared all-courses unlock.
6. Confirmed receipt keyed by Stripe Checkout Session ID and tied to the exact course and user.

## Required checkout behavior
- Authenticate user. Reject anonymous accounts.
- Only accept `course_id` from the browser; never accept Stripe price or monetary amount from browser.
- Resolve course ID via server-side allowlist and environment-specific price; require content ready.
- Refuse if already owned. Maintain atomic reservation / idempotency *per user and course*.
- Record exact course ID in Checkout metadata, linked to customer and verified consent; preserve UK-only eligibility enforcement.
- Keep subscription checkout and membership fulfilment separate.

## Required signed webhook behavior
- Authenticate Stripe signature, verify event livemode, payment status, session type, owner ID, exact course ID and its environment-specific Price ID from Stripe line items; one item quantity 1.
- Validate amount, currency, UK eligibility (for live checkout) and consent metadata; refuse mismatches without granting access.
- Make receipt recording idempotent per session; duplicate webhooks must not duplicate entitlement or email.
- Do **not** send email synchronously within the webhook.
- Resolve course title from the trusted catalogue, never customer-supplied metadata.
- Ensure each paid course has an independent entitlement; access must never be granted by success URL.

## Live email / access sequencing gate
Current system only grants after provider acceptance of email. Before changing this, agree the business rule and implement atomic database transactions with idempotent fulfilment.
- To guarantee **immediate access on verified payment**, grant entitlement when a paid event is durably recorded, then independently queue email and retry. Email failure must not revoke paid access.
- Before enabling, verify recovery from email outages, duplicate events, concurrently processed events, delayed payments and interrupted database writes.
- Preserve durable customer contract confirmation and digital-content cancellation evidence; obtain a legal review of exact supply timing.

## Safe verification matrix (all 24 slugs)
- Positive signed sandbox paid session; correct user/course/price -> one entitlement and one confirmation.
- Wrong course or price; unpaid, replayed, live event to sandbox endpoint, wrong currency or amount -> no grant.
- Missing consent, non-UK address on live path, anonymous user, unknown account -> no grant.
- Repeat webhook twice and in genuine simultaneous connections -> one entitlement, one confirmation, one outbox entry.
- Two different courses to same user -> two independent entitlements, one purchase per course.
- Email provider outage -> paid access behaviour follows explicit agreed policy; retries remain idempotent.
- Ensure membership has no effect on individual course ownership.
- Paid content endpoint denies wrong user and unowned course.
- Test legacy `beginner-training-course` purchasing unchanged before rollout.

**Release policy:** This document and its code live only in the draft GitHub staging pull request. Do not merge, deploy, enable Stripe checkout or change Supabase security settings until validated and approved.

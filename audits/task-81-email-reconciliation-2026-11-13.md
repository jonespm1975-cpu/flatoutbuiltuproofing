# Task 81: sandbox email reconciliation — 2026-11-13 UTC

## Verified read-only database evidence
One purchase_confirmations row:
- Stripe session: cs_test_a0caswbXc3HIkD4VZJRQ7ZZ3W6dT5TICnhxcb0PZ0v1gYUOhHT5v00Ssye
- confirmation_email_status = sent
- confirmation_email_sent_at = 2026-11-12 22:28:36.658 UTC

One sandbox_email_retry_queue row joined by session:
- status = accepted
- attempts = 0
- provider_message_id = NULL
- last_error = NULL
- updated_at = 2026-11-12 16:12:25.947732 UTC

Queue update precedes confirmation's sent timestamp. The status combination is not evidence of Resend provider acceptance or delivery. Possible separate processing paths are a hypothesis, not a confirmed root cause.

## Reconciliation gate
1. Obtain Resend read-only provider event/message record by recipient and timestamp, using authorised provider access. Resend connector not currently available in this conversation.
2. Correlate provider message ID and status to the exact sandbox session; never infer delivery from database status alone.
3. Review historical code paths that updated confirmation and queue independently.
4. Do not automatically retry or resend historical session while acceptance remains ambiguous.
5. Do not alter historical records without verified provider evidence and a documented migration.
6. Keep Task 67 sandbox webhook deployment blocked pending provider reconciliation and end-to-end review.

No emails, payments, Checkout Sessions, account or subscription mutations performed. PR #5 remains draft and unmerged.

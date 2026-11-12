# Purchase-confirmation retry design and test plan

Status: **Design only; not deployed or enabled.** No messages sent and no payment configuration changed.

## Verified 12 November 2026
- One purchase confirmation remains `pending` in Supabase.
- Sandbox Stripe webhook v18 is active; it acknowledges entitlement after successful database writes even if email fails.
- Production webhook remains unchanged.
- No proof of Resend sender verification or email delivery.

## Safety requirements for implementation
1. Separate durable email outbox from entitlement granting.
2. Record status, attempt count, next-attempt timestamp, lease/lock expiry, last provider error, Resend message ID and sent timestamp.
3. Process only confirmed purchases with verified Stripe session references. Preserve test/live separation.
4. Atomically claim eligible rows to avoid two workers sending simultaneously; release expired leases safely.
5. Use a stable provider idempotency key derived from checkout session ID. Do not regenerate it on retry.
6. On a successful provider acceptance, record provider message ID; do not treat acceptance as proof of inbox delivery.
7. Apply exponential backoff with bounded retries and alert on terminal failures.
8. Never send a second email for a row already marked sent.
9. Do not expose service role keys or privileged retry endpoints to browser users.
10. Keep the worker disabled until sandbox tests and explicit production approval.

## Sandbox test matrix
- Valid signed test checkout grants one entitlement and creates one confirmation.
- Duplicate signed event leaves exactly one entitlement and confirmation.
- Invalid signature, wrong course, wrong price, missing consent, wrong user: no entitlement.
- Resend temporary 5xx: confirmation remains pending; entitlement persists; retry is scheduled.
- Missing Resend key/sender: no email sent; error is recorded.
- Resend 2xx: provider ID stored, status accepted/sent per chosen semantics.
- Repeat retry after accepted: no duplicate message.
- Concurrent workers: only one claims the same record.
- No live customer charges or changes to live Stripe settings.

## Launch gate
Do not enable automatic retries or live checkout until verified sender, signed sandbox events, duplicate prevention, durable outbox, delivery monitoring and legal review are complete.

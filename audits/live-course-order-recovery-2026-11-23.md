# Live £9.99 course order recovery check

23 November 2026. Tested on isolated PostgreSQL 16.2 using two simultaneous connections, fixture tables and the deployed definitions of claim_live_purchase_email_retry and finish_live_purchase_email_retry. Acceptance and rejection were simulated. No email or payment service was contacted.

## Results

- With the first worker's transaction open and holding the order lock, the second worker returned no claim. It also returned no claim after the first worker committed its lease.
- A mismatched token could not finalise the order. The fifth failed attempt stopped further claims and left access locked.
- Under the assumption of a confirmed rejection before sending, the guarded update below made one additional attempt available. Repeating the update had no effect.
- Only one worker claimed the recovered order. Simulated acceptance granted access once. Repeated finalisation, repeat claims and requeueing the accepted order had no effect.

## Handling a flagged order

1. In Owner Analytics, match the short reference and payment time to exactly one full live Checkout Session. Verify the paid £9.99 GBP order, buyer, course, access state and queue history. If the reference is ambiguous, stop until the full session is identified.
2. Check the recorded failure for **every** attempt. Only consider another send when there is positive evidence that all attempts failed before submission or were definitively rejected. A timeout, a missing message ID or a missing inbox message leaves the outcome unknown. Leave ambiguous cases flagged for investigation. An existing successful submission also rules out another send.
3. If an additional attempt is explicitly authorised for the particular order, an administrator can bind its full session ID to the SQL below. Capture the prior queue state and failure evidence in the order's private support record. Run in a transaction and check that exactly one row is returned before committing. A commit makes the order eligible for the existing scheduled worker. The test restores one attempt by moving the counter from five to four, so retain the private record of the earlier attempts.
4. After the worker runs, check the queue result, the purchase confirmation and the matching live access row. If still unresolved, investigate the cause before any further action.

```sql
update internal.live_purchase_email_outbox q
set status = 'pending', attempts = 4, next_attempt_at = now(), updated_at = now()
from public.purchase_confirmations c
where q.stripe_checkout_session_id = $1
  and c.stripe_checkout_session_id = q.stripe_checkout_session_id
  and left(c.stripe_checkout_session_id, 8) = 'cs_live_'
  and c.course_id = 'beginner-training-course'
  and c.paid_amount_pence = 999 and c.currency = 'gbp'
  and c.terms_version = '2026-11-21-course-v1'
  and c.confirmation_email_status = 'pending' and c.confirmation_email_sent_at is null
  and q.status = 'failed' and q.attempts = 5
  and q.provider_message_id is null and q.lease_token is null
  and q.lease_until is null
  and not exists (select 1 from public.course_access a
    where a.user_id = c.user_id and a.course_id = c.course_id
      and left(a.stripe_checkout_session_id, 8) = 'cs_live_')
returning q.stripe_checkout_session_id;
```

This tests database coordination and manual recovery. It does not exercise a real email send, a provider timeout after acceptance, or a live customer order.

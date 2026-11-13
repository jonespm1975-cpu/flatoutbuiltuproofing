# Owner-approved membership cancellation policy — 2026-11-13

The owner expressly confirmed that customers cancelling the £1.99/month membership should retain access through the end of the already-paid billing period. This is **not** necessarily the end of the calendar month.

## Requirements
- Customer may cancel renewal at any time.
- On cancellation, set Stripe subscription `cancel_at_period_end=true` or equivalent safe end-of-paid-period cancellation; **do not** immediately revoke current-period membership access.
- No subsequent recurring charge after cancellation takes effect, subject to Stripe status verification.
- Access remains valid through the current paid period and ends at its verified expiration; do not grant access on an unpaid or disputed period.
- One-time £9.99 purchased lessons remain separately entitled for the lifetime of the learning service, subject to the purchased terms and statutory rights.
- Clearly disclose renewal price, billing frequency, cancellation method and post-cancellation access duration in checkout, terms, confirmation, and member dashboard.
- Verify duplicate cancellation requests, webhook order, past-due status, payment failures, and renewal events in isolated sandbox tests.

## Status
**Policy approved by owner; implementation and production verification not yet completed.** No live subscription was modified, no payment created, no email sent, no deployment made. UK consumer-law review remains required before live checkout activation.

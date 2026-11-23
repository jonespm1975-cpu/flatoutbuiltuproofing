# Follow-up: historical sandbox errors — signing verification gate
Date 2026-11-13 UTC

User confirmed these events occurred during their own sandbox error testing.

## Verified source
membership-test-webhook v9:
- Missing stripe-signature or MEMBERSHIP_TEST_WEBHOOK_SECRET => HTTP 503.
- Failed Stripe constructEventAsync signature verification => HTTP 400 'Invalid signature'.
- event.livemode!==false => HTTP 400 'Live events prohibited'.
- Event type outside accepted subscription/invoice types => HTTP 200 'Ignored'.
- Missing fulfilment flag => HTTP 503.
Therefore the four HTTP 400 logs indicate signature verification failure OR prohibited live-mode event, assuming the deployed source matched the version during those requests. Stripe test events retrieved around the timestamp have livemode=false, but event-to-delivery correlation is not established.

stripe-test-webhook v25 explicitly ignores signed subscription-mode checkout.session.completed with HTTP 200; HTTP 422 logs therefore require individual delivery identity/response body to identify the actual cause. Do not change course validation based on timestamp alone.

## Blocker
Connected Stripe API supports listing events and webhook endpoints but not webhook delivery attempt response bodies. No safe basis to change secrets, replay events, or deploy.

## Recommended read-only resolution
Open Stripe test Workbench > Webhooks > respective endpoint > Event deliveries; select failed delivery at 2026-11-12 22:59 UTC and record event ID, HTTP status and response text (not headers containing secrets). For membership HTTP 400 distinguish 'Invalid signature' vs 'Live events prohibited'. For course HTTP 422 distinguish customer mapping, checkout mismatch, price mismatch or unknown customer. Correlate to event IDs before fixing.

No payments, emails, webhook retries, secret changes, deployments, subscription changes, entitlement changes, or production edits.

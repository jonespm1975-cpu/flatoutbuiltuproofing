# Postmark owner delivery check

On 24 November 2026, Postmark accepted one message from the verified business sender to the owner Gmail address. Supabase recorded delivery at 19:34:05 UTC. Gmail independently returned one matching inbox message. Postmark message ID: 12035e61-996f-4b6c-841b-62bcfb8d2340.

The outbound stream has an authenticated webhook for delivery and bounce. Postmark verified the registration. Supabase rejected an unauthenticated callback with HTTP 401. The real delivery callback matched the owner check. Bounce processing and replay handling were exercised with transaction-scoped test data.

The purchase queue test found a varchar/text mismatch in the claim function. After applying the explicit cast, the rolled-back database test passed for enqueue, claim, duplicate claim, finish, duplicate finish, delivery replay and bounce ordering. The owner test send route was removed after use. Current customer correspondence uses the business Gmail address; the archived agreed terms remain embedded.

No live payment or customer send occurred. The customer delivery scheduler is not active. A fresh Stripe test-mode end-to-end purchase was not performed. Live checkout and site design were outside this change.

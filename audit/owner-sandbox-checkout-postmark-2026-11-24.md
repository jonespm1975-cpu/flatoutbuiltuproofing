# Owner sandbox checkout and Postmark delivery

On 24 November 2026 a dedicated test account completed the Beginner Training Course checkout on Stripe’s hosted sandbox page using Stripe’s documented test card. The total was GBP 9.99. The owner receipt was bound to this checkout before submission.

Supabase recorded the reservation as fulfilled, the sandbox purchase at 999 pence, and a matching course access record. The transaction created one sandbox queue row and zero live confirmation jobs for this session. The sandbox sender claimed the receipt at 19:51:59 UTC. Postmark recorded delivery at 19:52:00 UTC under message ID 99b25819-a12f-4ed8-a42c-78156f521daf. The authenticated delivery callback recorded the same time in Supabase. A separate Gmail inbox search returned exactly one matching sandbox course receipt.

The temporary account-provisioning code was removed before submitting the checkout. The original sandbox sender source digest was restored. The test account and its sandbox receipt were retained for reconciliation. The production customer email scheduler was not activated. This exercises the separately scoped owner sandbox receipt, not a production customer order.

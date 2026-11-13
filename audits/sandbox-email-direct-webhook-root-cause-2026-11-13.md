# Root-cause investigation: sandbox email status discrepancy — 2026-11-13

## Verified installed source
Supabase Edge Function `stripe-test-webhook` version 25 contains a direct Resend POST to `https://api.resend.com/emails`. It checks `sent.ok` but does not parse/store the returned `id`. It then updates `purchase_confirmations.confirmation_email_status='sent'` and `confirmation_email_sent_at`. It does not atomically update the retry queue with a provider ID.

The installed `internal.finish_sandbox_email_retry_v3` rejects an accepted result without a nonempty provider ID and requires a valid active lease. The installed `internal.claim_sandbox_email_retry_v2` increments attempts before finish.

Read-only database join showed:
- sandbox queue status `accepted`, attempts `0`, provider_message_id NULL;
- matching purchase confirmation status `sent`, sent timestamp present, terms_version `sandbox-test`.

**Conclusion:** the direct webhook send path explains how the confirmation could be marked sent without a stored provider ID. It does not conclusively establish which code version wrote the queue's `accepted` status or that Resend accepted/delivered the message. The queue may have been inserted/marked by a separate earlier process.

## Safe corrective design — NOT DEPLOYED
1. Make the webhook only persist an idempotent pending confirmation and enqueue one job transactionally; never send directly in the webhook.
2. Use the leased retry worker exclusively for provider sending. Capture `Resend response.id`; only call finish accepted with a nonempty ID; persist ID and status atomically.
3. On unknown provider response, reconcile using provider logs and idempotency key before retrying; do not blindly resend.
4. Use distinct `provider_accepted` and `delivered` statuses or separate fields; delivery is confirmed only by provider delivery event.
5. Ensure webhook duplicate event and queue creation are idempotent; do not alter existing customer entitlements.
6. Test isolated two-connection claim race, expired lease, duplicate webhook, and provider timeout before deployment.
7. Keep live purchase email worker disabled until all gates pass.

## No changes
No email was sent, no payment created, no queue status changed, no live checkout enabled, no function deployed. Resend delivery and real database concurrency remain unverified.

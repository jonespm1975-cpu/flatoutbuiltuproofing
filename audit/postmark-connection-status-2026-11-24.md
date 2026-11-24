# Postmark connection status — 24 November 2026

## Owner-provided evidence
- The domain `flatoutbuiltuproofing.co.uk` has verified Postmark DKIM and Return-Path according to the Postmark screenshots provided by the owner.
- Mail sent to `info@flatoutbuiltuproofing.co.uk` was successfully forwarded to `flatoutbuiltuproofing@gmail.com`, corroborated by the connected Gmail account.
- Postmark emailed the owner confirming approval to send from the application to any address.
- The owner says a Postmark Server API Token is saved privately. The secret has NOT been verified as stored in Supabase.

## Independently checked through plugins
- Supabase project `fhyhshakmvqwzdyannec` is ACTIVE_HEALTHY.
- Edge Function `future-contract-confirmation-worker` is deployed (v2) and includes Postmark transport, but the code requires `FUTURE_CONFIRMATION_DELIVERY_ENABLED=true`, `FUTURE_CONFIRMATION_PROVIDER=postmark`, `POSTMARK_SERVER_TOKEN`, and `FUTURE_CONFIRMATION_FROM`. No deployment or activation was performed.
- Email delivery webhook v2 exists and requires separate authentication/configuration. Do not activate before webhook authentication and end-to-end testing.
- The retired email sender returns HTTP 410 and performs no sending.
- `internal.future_contract_confirmation_jobs` has no rows on the latest read.
- Stripe production customer portal `bpc_1UfOBAKeIprRDTKxKLJQmlQ7` exists, active, configured for end-of-period cancellation.
- GitHub repository is accessible; website pages remain unchanged.

## Outstanding actions (no secrets in GitHub)
1. Store the private Postmark Server API Token directly in Supabase Edge Function Secrets as `POSTMARK_SERVER_TOKEN`. Supabase connector currently has no operation to add or list secrets; do not solicit tokens in chats or commit secrets to GitHub.
2. Configure the verified sender `FUTURE_CONFIRMATION_FROM=info@flatoutbuiltuproofing.co.uk` and provider `FUTURE_CONFIRMATION_PROVIDER=postmark` through secure dashboard access.
3. Confirm Postmark MessageStream `outbound` works for the approved server and account. No customer emails until a controlled, consented test.
4. Perform authenticated worker test and provider delivery confirmation with a known safe recipient, and validate no duplicate send across retries.
5. Ensure the durable contract confirmation text/contact information aligns with the business's current approved contact policy. Existing archived contractual snapshots must not be silently rewritten.
6. Only after testing and approval, configure scheduler/enable the future delivery flag and callback; keep fulfilment separate and do not replay historic accepted messages.
7. Investigate outstanding Supabase security advisories, including the exposed SECURITY DEFINER order query and leaked-password protection.

Do not charge customers, enable live membership, change approved website design, or use the retired email provider in this workflow.

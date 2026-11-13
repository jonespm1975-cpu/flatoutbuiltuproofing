# Flat Out Built-Up Roofing — Plugin access and sandbox webhook handoff
**Updated:** 13 November 2026 (UTC)

## Quick access links

| Service | Sign in / project | Control shortcut |
|---|---|---|
| Stripe | [Stripe Dashboard](https://dashboard.stripe.com/login) | [Sandbox Workbench webhooks](https://dashboard.stripe.com/acct_1UaPRuKS41qhUQTK/test/workbench/webhooks) · [Live account dashboard](https://dashboard.stripe.com/acct_1UT8NBKeIprRDTKx/) |
| Supabase | [Project dashboard](https://supabase.com/dashboard/project/fhyhshakmvqwzdyannec) | [Edge Function secrets](https://supabase.com/dashboard/project/fhyhshakmvqwzdyannec/functions/secrets) |
| GitHub | [Flat Out Built-Up Roofing repository](https://github.com/jonespm1975-cpu/flatoutbuiltuproofing) | [Audit folder](https://github.com/jonespm1975-cpu/flatoutbuiltuproofing/tree/main/audits) |
| Higgsfield | [Higgsfield sign-in](https://creators.higgsfield.ai/auth/email/sign-in?rp=%2F) | Use the workspace/project controls after signing in. |
| Gmail | [Gmail inbox](https://mail.google.com/) | Use Gmail's account switcher/settings after signing in. |
| OpenAI Platform | [OpenAI Platform](https://platform.openai.com/) | [API keys](https://platform.openai.com/api-keys) |
| ChatGPT app connections | [Manage connected apps in ChatGPT](https://help.openai.com/en/articles/20001494-connecting-and-managing-app-accounts-in-chatgpt) | In ChatGPT, open **Settings → Apps** (or **Plugins**, depending on the interface). |

Direct links open the service; each service may still require its own sign-in, passkey, or verification step. Never paste passwords, one-time codes, API keys, or webhook signing secrets into this repository or chat.

## Connection check

- Stripe: connected to the live account and the separate test account.
- Supabase: project `fhyhshakmvqwzdyannec` is active and healthy.
- GitHub: repository access is available.
- Higgsfield: account workspace is available.
- Gmail: mailbox access is available.
- OpenAI Developers plugin: not installed for this request; use the OpenAI Platform link above for direct account access. Do not assume the Developers plugin is connected.

## Stripe sandbox event diagnosis

- Event: `evt_1Ub6xTKS41qhUQTKCAsjwHU2`, `checkout.session.completed`, `livemode=false`, £1.99 monthly membership, `pending_webhooks=1` on the latest read.
- The matching Supabase membership row is sandbox-only, currently active, with `cancel_at_period_end=true`. This is database state, not proof that the pending Stripe delivery has been cleared.
- Stripe sandbox endpoint `stripe-test-webhook` listens for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. The separate `membership-test-webhook` listens for subscription and invoice lifecycle events.
- Supabase logs show the course test webhook returned HTTP 422 on earlier retries (function versions 20 and 23). The event is a subscription checkout; those older handlers treated it as a course purchase.
- Current deployed `stripe-test-webhook` version 25 has an early sandbox-subscription branch that safely acknowledges subscription checkout without granting course access or sending a course receipt.
- No delivery retry was performed in this audit. The Stripe API tool does not expose an endpoint-specific retry action. After the code fix, use the sandbox Workbench link above and retry this event only to `stripe-test-webhook`. Do not retry it to `membership-test-webhook`; do not change live settings.
- Verify the endpoint response is HTTP 200 and that the event is no longer pending before closing the task.

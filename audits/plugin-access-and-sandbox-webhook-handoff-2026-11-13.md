# Flat Out Built-Up Roofing — plugin links and sandbox webhook handoff
**Updated:** 13 November 2026 (UTC)

## Quick links

### Stripe
- [Sign in to Stripe Dashboard](https://dashboard.stripe.com/login)
- [Sandbox Workbench — webhooks](https://dashboard.stripe.com/acct_1UaPRuKS41qhUQTK/test/workbench/webhooks)
- [Live Stripe account](https://dashboard.stripe.com/acct_1UT8NBKeIprRDTKx/)

### Supabase
- [Open the project](https://supabase.com/dashboard/project/fhyhshakmvqwzdyannec)
- [Edge Function secrets](https://supabase.com/dashboard/project/fhyhshakmvqwzdyannec/functions/secrets)

### GitHub
- [Flat Out Built-Up Roofing repository](https://github.com/jonespm1975-cpu/flatoutbuiltuproofing)
- [Audit folder](https://github.com/jonespm1975-cpu/flatoutbuiltuproofing/tree/main/audits)

### Higgsfield
- [Sign in to Higgsfield](https://creators.higgsfield.ai/auth/email/sign-in?rp=%2F)
- After signing in, use the workspace and project controls.

### Gmail
- [Open Gmail](https://mail.google.com/)
- Use the account switcher and settings after signing in.

### OpenAI Platform
- [Open the OpenAI Platform](https://platform.openai.com/)
- [API keys](https://platform.openai.com/api-keys)

### ChatGPT connected apps
- [Manage connected app accounts](https://help.openai.com/en/articles/20001494-connecting-and-managing-app-accounts-in-chatgpt)
- In ChatGPT, open **Settings → Apps** (the label may appear as **Plugins** in some interfaces).

These links open the official service pages. Each service may still require its own sign-in, passkey, or verification. Never paste passwords, one-time codes, API keys, or webhook signing secrets into this repository or chat.

## Connection check

- Stripe: connected to the live account and the separate test account.
- Supabase: project `fhyhshakmvqwzdyannec` is active and healthy.
- GitHub: repository access is available.
- Higgsfield: account workspace is available.
- Gmail: mailbox access is available.
- OpenAI Developers plugin: not installed for this request. The OpenAI Platform links above are available for direct account access.

## Stripe sandbox event diagnosis

- Event `evt_1Ub6xTKS41qhUQTKCAsjwHU2` is `checkout.session.completed`, `livemode=false`, a £1.99 monthly membership checkout, and had `pending_webhooks=1` on the latest read.
- The matching Supabase membership row is sandbox-only, active, and set to cancel at period end. This database state does not prove the pending Stripe delivery has been cleared.
- Sandbox endpoint `stripe-test-webhook` listens for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. The separate `membership-test-webhook` listens for subscription and invoice lifecycle events.
- Supabase logs show earlier HTTP 422 responses from course test webhook versions 20 and 23. The event is a subscription checkout; those older handlers treated it as a course purchase.
- Deployed `stripe-test-webhook` version 25 has a sandbox-subscription branch that safely acknowledges subscription checkout without granting course access or sending a course receipt.
- No delivery retry was performed in this audit. The Stripe API tool does not expose an endpoint-specific retry action.
- **Next dashboard step:** Open the Sandbox Workbench link above, select `stripe-test-webhook`, find this event, and retry it only to that endpoint. Do not retry it to `membership-test-webhook` or change live settings.
- Confirm the endpoint response is HTTP 200 and the event is no longer pending before closing the task.

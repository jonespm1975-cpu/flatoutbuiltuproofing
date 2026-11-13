# Live membership launch blocker — verified 2026-11-13

Stripe live account acct_1UT8NBKeIprRDTKx has only one active product, the beginner training course, and two active one-time GBP 999 prices. No £1.99 recurring price or membership product exists in the returned complete lists (has_more=false). The sandbox recurring GBP 199 monthly price is NOT live and must not be used for real checkout.

Main-branch purchase-info.html remains a deliberately disabled preview with a disabled consent checkbox and checkout button; it is not a live payment flow. The main legal pages remain DRAFT with unresolved placeholders.

## Safe resolution specification
- Create a separate live membership product and GBP 199 monthly recurring price, tax-inclusive only after confirming correct seller/tax configuration; do not create a checkout session or payment in the process.
- Wire live price ID only to an authenticated server-side checkout creation endpoint that checks for an existing active membership and uses Stripe idempotency.
- Present recurring terms and cancellation separately from immediate one-off digital content consent. Preserve cancel-at-period-end and course entitlements.
- Require verified webhook before granting paid membership; test subscription lifecycle, duplicate delivery and failed renewal in sandbox.
- Finalize and approve legal disclosures and durable purchase confirmations, and independently verify Resend and database concurrency before activation.

**Status:** blocker diagnosed and safe change plan documented. Live price/product NOT created; live billing unchanged. No emails, payments, subscriptions, checkout sessions or production deployments.

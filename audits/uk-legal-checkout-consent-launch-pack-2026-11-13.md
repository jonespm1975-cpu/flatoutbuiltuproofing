# Checkout and UK legal launch pack — 13 November 2026

**Status: FOR OWNER/UK LEGAL REVIEW — NOT LIVE LEGAL TERMS.** The current main-branch terms.html, privacy.html, refunds.html and cookies.html are explicitly drafts. Do not remove their warnings or enable billing before the factual items below are resolved.

## Trader and service
Trader: Paul Jones, sole trader trading as Flat Out Built-Up Roofing. Existing published business contact details in main-branch legal pages should be confirmed for continued publication. Contact email: jonespm1975@gmail.com. Not VAT registered (owner stated). Training only, not a qualification or substitute for competent supervision, site risk assessment or manufacturer instructions.

## Price and access disclosure
One-off lesson: £9.99 total where applicable, accessible while learning service operates, subject to statutory rights. Membership: £1.99 each month, recurring until cancelled, with clear billing interval, start date, cancellation method, and access termination policy. Never imply membership includes purchased lifetime-access lessons unless entitlement logic actually implements that. Explicitly identify what the membership unlocks and whether any content is excluded. Confirm live Stripe prices and tax treatment independently; verified sandbox prices do not establish live prices.

## Digital content cancellation (draft consumer explanation)
For a consumer purchasing digital content at a distance, a 14-day cancellation right ordinarily applies. For digital content not supplied on a tangible medium, the consumer may lose that right after supply begins only if statutory conditions are satisfied, including express prior consent to supply during the cancellation period, acknowledgement of loss of the right, and required contract confirmation. These conditions must be captured before supply, not inferred from payment or a general terms checkbox. Faulty/not-as-described digital content retains statutory remedies.

For ongoing digital services and subscriptions, cancellation rights and consequences can differ from a single immediate digital-content purchase. Do **not** apply the one-off digital-content waiver automatically to the £1.99 membership. Obtain UK legal review of the correct cancellation classification, pro-rata/refund rules and recurring billing disclosures.

## Checkout interface contract
- Present trader identity/contact, item description, total GBP amount, taxes, payment interval, renewal, access conditions, device/browser compatibility and cancellation information BEFORE payment.
- For immediate one-off digital content, an **unticked** checkbox: “I expressly consent to the digital lesson being supplied immediately, before the end of the 14-day cancellation period.”
- A second **unticked** checkbox: “I acknowledge that I will lose my 14-day cancellation right for this digital lesson once supply begins, provided the legal requirements are met.”
- A separate link to terms/privacy/refunds; do not combine marketing consent.
- Record server-side user ID, product/course ID, checkout session, consent text/version, timestamp, and IP/user-agent only where necessary and disclosed; prevent client-controlled metadata alone from proving consent.
- Payment button clearly communicates obligation to pay (e.g., “Pay £9.99 now” or “Subscribe for £1.99/month”).
- Confirm contract on durable medium, including required consent/acknowledgement and purchase details; do not claim this is working until Resend verified.
- Require server-verified paid Stripe webhook before granting entitlement. Duplicate webhook delivery must not double-unlock or email.
- Provide clear self-service cancellation path for recurring membership, and explain whether access remains until paid period end.

## Privacy and cookie completion
Replace all placeholders with factual retention schedules, legal bases, actual processors/transfer safeguards, DPA roles, contact and rights process, marketing arrangements, account deletion process, cookie inventory, retention durations and consent settings. Do not enable optional analytics/advertising cookies before lawful consent controls are functioning. Review ICO registration/fee applicability.

## Verification and acceptance criteria
1. Confirm actual live Stripe product/price objects and whether live checkout is enabled, without making payments.
2. Verify each legal page link and text on deployed site, including mobile.
3. Automated consent tests: unchecked controls cannot start immediate digital supply; subscription path uses distinct consent/cancellation rules; text/version stored and bound to server-side session; replay does not create duplicate entitlement.
4. Independently verify Resend message acceptance and delivery status; historical accepted queue row with null provider ID must not be resent.
5. Run two persistent PostgreSQL sessions against disposable clone for claim single-winner and rollback.
6. Owner/legal signoff, then controlled live activation and monitored first legitimate purchase.

**No legal compliance claim or activation approval is implied by this draft.**

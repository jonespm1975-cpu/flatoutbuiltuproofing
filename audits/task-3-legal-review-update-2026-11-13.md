# Task 3 legal review update — 2026-11-13

## Work completed
- Re-read the review branch copies of `terms.html`, `privacy.html`, `refunds.html` and `purchase-info.html`.
- Verified all remain marked DRAFT. No live site files were changed and nothing was deployed.
- Checked current UK official guidance: pre-order information, clear price and trader/contact information, digital content functionality and durable contract confirmation are required; immediate digital supply during the 14-day cancellation period needs express consent and acknowledgement before supply, and confirmation must include that consent/acknowledgement.
- The purchase preview keeps checkout disabled and separates terms acceptance, immediate-supply consent and cancellation acknowledgement. This is a useful staged design, but it does not implement the transaction record or durable confirmation by itself.
- The owner has already stated the business is a UK sole trader, is not VAT registered, the site is for training/learning, and lead generation is not to be enabled now. The £9.99 course price and service-lifetime access model are stated in the drafts and must still match the actual product and checkout.

## Legal release blockers still requiring verified facts or owner confirmation
1. Privacy retention: specify and implement deletion/retention criteria for accounts, enquiries/gallery submissions, payment/tax records and security logs. UK law does not supply one blanket retention period for all these categories; use a documented purpose-specific schedule and confirm tax/accounting obligations.
2. Actual processing: verify active providers, roles, storage regions and any international-transfer safeguards from current account settings and contractual terms. The draft's list is only potential providers.
3. Features and audience: confirm whether marketing, analytics, advertising/non-essential cookies, gallery/community submissions, or under-18 accounts will exist at launch. If a feature is not enabled, say so accurately and keep it disabled.
4. Service facts: confirm actual course content, supported devices/browser requirements, accessibility limits, video and offline/download behavior, support contact handling, access duration and closure handling.
5. Checkout evidence: implement and test persistence of the three affirmative consent decisions, timestamp, exact approved terms version, and a durable confirmation containing required pre-contract information. The current preview says those choices are not submitted or stored.
6. Final approval: the business owner must approve the final text and version. Do not remove DRAFT notices or set an approved-terms version before that approval.

## Release decision
Task 3 is completed as a source and legal-requirements review with an actionable release-gate list. The documents are not ready to publish as final legal terms because the facts above are not established in the repository. Keep production checkout disabled until those facts are verified, the consent/confirmation path is implemented and tested, and the final wording is approved.

## Official sources checked
- GOV.UK, Online and distance selling: https://www.gov.uk/online-and-distance-selling-for-businesses
- GOV.UK, Online selling: https://www.gov.uk/online-and-distance-selling-for-businesses/online-selling
- Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, regulation 37: https://www.legislation.gov.uk/uksi/2013/3134/regulation/37
- Consumer Contracts Regulations 2013, regulation 16: https://www.legislation.gov.uk/uksi/2013/3134/regulation/16

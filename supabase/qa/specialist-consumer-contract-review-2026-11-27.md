# Specialist course consumer contract — desk review and release checklist

Date: 27 November 2026. Scope: existing specialist-2026-11-27-v1 archive, specialist-course-order.html and deployed specialist-postmark-confirmation-worker v3. Owner commercial approval is separate. This is not a solicitor's opinion or approval to release.

## Verified from actual source
- All 24 order-page course records are unreleased; contract archive approved=false; purchase controls require both releases.
- One-off GBP 9.99 price, separate membership, seller identity, geographical contact address, email, compatibility, account requirements, UK restriction and statutory remedies are described.
- Three required, initially unchecked consent boxes use the archived wording. Submission passes course ID, terms version and consent booleans. Stripe destination is checked.
- The Postmark worker rejects unapproved archives, mismatched terms version, sandbox IDs, incorrect amounts/currencies and invalid consent chronology. The message includes course identity, price, access link, contract and refund text, consent wording and recorded timestamp.
- Actual provider no-send testing of 24 payloads and one owner-only sandbox email are separate evidence, not production delivery approval.

## Required before release
1. Prepare a new coordinated archive version. Update the product description to reflect four written sections, an original conceptual illustration, a worked example, a written exercise and model answer, eight knowledge questions with feedback and an approximate 30-minute active-learning target. Avoid implying accreditation, installation competence or guaranteed duration.
2. Verify the seller's actual business/contact address and available customer service contact channels. Do not publish a replacement address without establishing that it satisfies applicable information requirements. Check complaint handling, applicable ADR disclosures, digital functionality, technical protection and interoperability disclosures against Schedule 2 and actual service behavior.
3. Confirm how pre-contract information, the exact archived consent statements, date/time and selected course are retained and delivered in durable form. Under regulation 16, deliver confirmation in reasonable time; include consent and acknowledgement. Ensure failed/bounced delivery is reviewed; do not rely on loss of cancellation rights if required confirmation is missing.
4. Confirm the cancellation form, applicable cancellation-period calculation, refund process and the Consumer Rights Act 2015 digital-content remedies. Do not apply a blanket no-refunds policy. Obtain qualified advice on the exact moment supply begins and the legal treatment of continuing online access.
5. Review final Stripe payment button wording, price visibility, terms presentation, accessibility, unchecked consent controls and customer flow on actual mobile and desktop browsers.
6. Synchronise final approved archive, checkout, webhook, database reservation/fulfilment and Postmark worker to exactly one version. Re-test all 24 course mappings; confirm real authenticated access and durable confirmations. Keep release flags false until prerequisites pass.
7. Independent competent roofing review is pending. No customer charge, no new customer email, no change to website layout or existing contract archive made.

## Official references
- https://www.legislation.gov.uk/uksi/2013/3134/regulation/13
- https://www.legislation.gov.uk/uksi/2013/3134/regulation/14
- https://www.legislation.gov.uk/uksi/2013/3134/regulation/16
- https://www.legislation.gov.uk/uksi/2013/3134/regulation/37
- https://www.legislation.gov.uk/uksi/2013/3134/schedule/2
- https://www.legislation.gov.uk/uksi/2013/3134/schedule/3
- https://www.legislation.gov.uk/ukpga/2015/15/part/1/chapter/3
- https://www.gov.uk/online-and-distance-selling-for-businesses
- https://www.businesscompanion.info/en/quick-guides/distance-sales/consumer-contracts-distance-sales

## Disposition
Desk review recorded. Revised contract version and qualified legal review remain pending. No assertion of full legal compliance.

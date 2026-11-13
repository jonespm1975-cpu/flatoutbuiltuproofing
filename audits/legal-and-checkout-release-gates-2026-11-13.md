# Legal and checkout release-gate review — 2026-11-13

## Source and scope
Read the GitHub `main` branch source for `terms.html`, `privacy.html`, `refunds.html`, `cookies.html`, and `purchase-info.html`. The public-page open tool could not access the site URLs, so this report describes repository source only and does not claim the live rendering was verified. No website files were changed or deployed.

## Verified source status
- `terms.html`, `privacy.html`, `refunds.html`, and `cookies.html` are explicitly marked DRAFT.
- `privacy.html` contains owner decision placeholders for account deletion/retention, enquiries/submissions retention, transaction/tax retention schedule, security-log retention, marketing/unsubscribe handling, and age/parental-consent arrangements.
- The privacy draft also says actual processors, processing roles, locations, international-transfer safeguards and agreements need confirmation.
- `terms.html` says checkout, digital-delivery, accessibility and consumer-law wording require review/testing. It says device/browser compatibility, accessibility, offline/download availability and support response arrangements must be confirmed.
- `refunds.html` is a draft and says the immediate digital-supply consent and checkout process must be implemented and tested.
- `purchase-info.html` explicitly says purchases are not open. Its consent checkbox and checkout button are disabled; the page says no payment will be taken and no lesson unlocked.
- Google Drive search found no FOBUR legal/source file. Recent Gmail search found no Resend delivery notice; it did find a sent progress backup, which is not provider-delivery evidence.

## Release effect
The current repository purchase page does not provide a customer checkout. Legal and consent pages must be completed and approved before enabling sales. Do not remove DRAFT labels, enable the consent control, activate a checkout button, or deploy based on assumptions about retention, age policy, cookies, or legal text.

## Owner decisions needed
1. Confirm the operational data-retention periods and deletion process.
2. Confirm whether marketing, analytics, advertising cookies, gallery submissions, or under-18 accounts will be enabled; document the actual practice.
3. Confirm service providers, processing roles, storage regions and any international-transfer safeguards against the actual account settings.
4. Approve the final product description, access duration, support arrangements, compatibility/accessibility statement and checkout consent wording.
5. Approve the final legal text/version that will be set as `APPROVED_TERMS_VERSION`.

After those details are supplied, the assistant can update the review branch, run source checks, and leave deployment disabled pending the remaining technical gates and explicit production approval.

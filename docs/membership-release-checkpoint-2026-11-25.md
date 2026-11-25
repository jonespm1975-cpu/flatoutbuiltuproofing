# £5 monthly membership — release checkpoint, 25 November 2026

Status: HOLD. UK-only release. Supabase Free. Postmark only. Do not change approved homepage designs or activate real billing before remaining checks pass.

## Verified evidence

- Authenticated sandbox checkout endpoint created a £5 GBP monthly Checkout Session; missing consent fields and stale terms version rejected (HTTP 422). Valid consent persisted; test session expired without payment (database HTTP request 2562).
- Signed sandbox £5 payment and automatic owner confirmation previously verified, including actual mailbox delivery.
- Partial and full sandbox refunds distinguished. Active sandbox membership automatically cancelled after full refund; Stripe and Supabase cancelled and entitlement denied.
- Genuine sandbox dispute generated and won. Controlled replay of canonical events through sandbox webhook recorded and cleared its matching hold; eligible access restored. Direct Stripe delivery is NOT yet verified: original created and closed events each remain pending. Rate limiting (HTTP 429) observed; bounded retry added.
- Authenticated sandbox billing portal session created (HTTP 200); sandbox-only payment denied production learning content (HTTP 403), request 2563. Browser interaction not verified.
- QA consent binding tests reject missing consent, user mismatch, duplicate use and unauthorised caller. Live risk binding and exact price entitlement checks passed transactionally.
- Production scheduler token checks, queue readiness and database concurrency checks passed. Scheduler job 7 remains inactive.
- Temporary test endpoints retired and temporary tokens cleared. No active QA memberships and no live memberships at latest check.
- Latest security advisor scan: zero errors; two intentional authenticated SECURITY DEFINER function warnings, one leaked-password-protection warning; internal and service-only RLS informational findings. Not a guarantee of overall security.

## Release gates (not passed)

1. In Stripe sandbox Workbench, redeliver only the existing charge.dispute.created and charge.dispute.closed events to the dedicated membership QA endpoint. Confirm HTTP 200, zero pending, and no entitlement restored for cancelled fixture.
2. Use an authenticated interactive browser with the designated QA account. Open /members.html?membership_500_qa=start. Check all four consent boxes, complete a Stripe sandbox checkout with a test card, verify database consent/subscription binding and confirmation. Never use a real card.
3. Verify learning UI, supported-device voice functions, and access isolation. A sandbox account must never obtain production-only paid content. Use an isolated QA learning path for positive browser tests.
4. Open customer portal and schedule cancellation at period end. Verify Stripe and Supabase match; access remains until paid period end; clean up the test subscription.
5. Recheck release gates and provider settings; obtain successful end-to-end evidence before enabling production functions, live webhook, UI and confirmation scheduler in coordinated order. Confirm rollback plan. No real-money owner test without explicit approval.

## Operational constraints

Keep live checkout, fulfilment, portal and confirmation worker hard release locks in place until all gates pass. Do not expose credentials or test account identifiers in public repository files. Maintain the approved £5 monthly price, separate course purchases and four page layouts. A production deployment of locked code is not a production payment test.

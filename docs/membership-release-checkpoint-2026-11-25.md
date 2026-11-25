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

## Subsequent verified evidence — 25 November

- Isolated sandbox Voice Learning page published; production and QA Start Learning hotspot repaired and verified on live HTML (HTTP requests 2570–2571). QA uses only sandbox endpoint and does not register a service worker.
- GitHub isolated Chromium run 45692456531 passed all 22 logged scenarios across mobile and desktop, including simulated membership consent, exact Stripe destination hosts, sandbox voice controls, denied and wrong-mode responses. Physical microphone and real hosted checkout are NOT covered.
- Actual Stripe API-created £5 sandbox subscription with synthetic consent binding granted authenticated QA learning content (HTTP 200, two demonstration sections), denied production content (HTTP 403), and cancellation removed entitlement. Request 2572. No real money and no customer consent implied.
- Temporary test functions retired (HTTP 410 code, JWT required), tokens cleared; database scope constraint now permits check_only and dispatch only. Queue readiness HTTP 200, sending_enabled false (request 2580); scheduler remains inactive.
- Live price verified GBP 500 monthly, no trial, portal cancellation at period end, subscription changes disabled, dedicated live webhook disabled with nine expected event types. Production receipt delivery is not verified.
- All four main pages plus root returned HTTP 200; £5 advertised as coming soon, no £1.99 literal in HTML. Terms/refund pages verified published with matching membership conditions; privacy names Postmark. Cancellation template update deployed in Pages run 45693919080. No independent legal certification.
- Remaining gates: direct Stripe sandbox dispute redelivery (both original events pending at last check), real interactive sandbox checkout and portal cancellation, physical microphone test and coordinated production activation. Use ChatGPT Work Cloud Browser or owner dashboard for interaction; current connectors do not provide direct redelivery or browser control. No live charges or design changes authorised by this checkpoint.

# Historical Stripe sandbox session reconciliation — 2026-11-13

## Access
Stripe connector successfully listed live account `acct_1UT8NBKeIprRDTKx` and sandbox account `acct_1UaPRuKS41qhUQTK` via linked Stripe plugin. Only sandbox GET API operations used; no live reads or writes needed.

## Source
Stripe `GET /v1/checkout/sessions` returned five complete/paid sandbox sessions (four course-labelled and one £1.99 monthly membership). `GET /v1/events` returned historical `checkout.session.completed` events, including event `evt_1UahMZKS41qhUQTK8J1OszL3` for 11 Nov 19:39 UTC course purchase. Exact session-ID comparisons performed via read-only SQL in Supabase.

## Course session comparisons
| Session suffix | Stripe paid amount | Supabase course_access | Supabase purchase_confirmations |
|---|---:|---|---|
| `5v00Ssye` | 999 GBP pence | no | yes |
| `JeYMzzZG` | 999 GBP pence | yes | no |
| `fAtzZZhm` | 1199 GBP pence | no | no |
| `nL5PHt5u` | 1199 GBP pence | yes | no |

All four are historical sandbox paid sessions, with course metadata. No session IDs/user identifiers included in full here. Historical £11.99 sessions are not the current £9.99 product price.

## Findings
- At least one historical paid sandbox session has a confirmation but no course_access record.
- At least two historical paid sandbox sessions have course_access but no matching confirmation.
- One older paid £11.99 session has neither record; requires checking webhook version and original acceptance criteria before deciding if that was intentional.
- Do not backfill automatically: older sessions may fail current amount/price/consent checks. Need event-level webhook response and version evidence.
- Resend provider delivery status still **unverified**. A Supabase `sent` flag is not a Resend delivered event; provider message ID missing in queue.

## Next safe steps
Read historical Stripe event delivery attempts and destination response bodies; compare deployed webhook versions and rejection criteria; obtain Resend provider logs/IDs. Stage idempotent fixes only after verified cause. No replay or email resend while outcome is uncertain.

## No mutation
No Stripe writes, payment/Checkout creation, webhook replay, Supabase changes, emails, entitlements, live billing or subscription changes.

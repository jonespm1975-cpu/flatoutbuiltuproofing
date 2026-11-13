# Task 27 — Stripe sandbox checkout-to-entitlement reconciliation
Date: 2026-11-13 UTC. Status: READ-ONLY INVESTIGATION COMPLETE; duplicate checkout prevention remains separate follow-up.

## Original Stripe sessions verified
- Confirmation session cs_test_a0caswbXc3HIkD4VZJRQ7ZZ3W6dT5TICnhxcb0PZ0v1gYUOhHT5v00Ssye: paid/complete/test, mode=payment, GBP subtotal=999 total=999, user e3e7ec12-c5fa-4486-ad4f-8af5fcfa919e, course beginner-training-course, consent metadata true, exactly one line item price_1UaRCSKS41qhUQTKl2uSNnYN qty 1.
- Earlier entitlement session cs_test_a0DwPblxRGoAzNBGVWY5g2qA5lqMgnxO7WVWN231zQcErjsdhdJeYMzzZG: paid/complete/test, GBP subtotal=999 total=999, SAME user/course and same expected price and qty. Its earlier course_access row was created 2026-11-11 02:29:56 UTC.
- Separate user entitlement session cs_test_a0TY2kMZoZpfg5ceI4lrSvnknG6ihGgkVhrpseYkvr6eHAyOWtnL5PHt5u: paid/complete/test, subtotal=999 total=1199, user 87fca075-224a-4379-bafb-3a01e41890f4, course beginner-training-course, DIFFERENT line-item price price_1UaPSRKS41qhUQTK2BbUBUTf (legacy test price), qty 1. Existing course_access row created 2026-11-11 02:18:58 UTC. This older entitlement should not be treated as proof the CURRENT course webhook allowlist would accept the legacy price.

## Supabase reconciliation
- Two course_access rows, distinct users; zero duplicate user/course pairs.
- One purchase_confirmations row with status sent, matching the second account and later session; the later session is different from the earlier entitlement session because two separate successful test purchases occurred for the same user/course.
- Current webhook uses course_access upsert onConflict user_id,course_id ignoreDuplicates=true; this prevents duplicate entitlement rows, but does NOT prevent a second checkout/payment before it happens.
- Receipt upsert uses stripe_checkout_session_id for idempotency; separate paid checkout sessions may create separate receipts if processed. One receipt exists now; absence of another is not itself proof of failure.
- Customer mapping is consistent across each original Stripe session and corresponding Supabase records. No unauthorized access demonstrated in these inspected rows.

## Risk and next action
- Confirm and implement server-side pre-check preventing checkout creation for already entitled users, with robust concurrent-checkout/idempotency protection and no live billing change. Historical duplicate sandbox payments cannot be undone by merely adjusting course_access.
- Investigate whether the legacy 1199-total session and older price were expected historical test configuration; preserve its existing entitlement until verified.
- Test duplicate checkout prevention without creating payments, using static code review and non-mutating tests where possible.
- Email status sent indicates submission, not inbox delivery.

## Safety
No new payments, checkout sessions, event retries, SQL mutations, webhook deployments, live billing changes, subscription cancellation changes or Supabase plan changes. Do not rewrite historical checkout IDs to make them match.
# Task 224 — Pending sandbox membership webhook remediation — 2026-11-13

## Issue
Stripe TEST event evt_1Ub6xTKS41qhUQTKCAsjwHU2 (checkout.session.completed, £1.99 subscription) has pending_webhooks=1. Historical POST 422 responses occurred on 12 Nov 2026 against older deployments of stripe-test-webhook.

## Verified correction
Current deployed stripe-test-webhook v25 checks session.mode === "subscription" before course price and consent validation, returning HTTP 200 without granting course access. No new deployment required for this branch of the handler.

## Tests
Eight source-level assertions evaluated against the GitHub staged checkout and webhook and all passed: signature construction, live-mode guard, payment-mode guard, exact approved terms version, atomic fulfilment RPC, no direct Resend, checkout terms version guard, and four authored regression test cases. These do not substitute for node --test or HTTP signed-event integration tests.

## Operational blocker
Connected Stripe API supports GET event and webhook endpoint, but no resend/retry delivery operation was exposed. No manual retry was executed, and pending_webhooks is NOT yet cleared. Stripe Workbench delivery retry is the correct next step; select ONLY existing event evt_1Ub6xTKS41qhUQTKCAsjwHU2 and ONLY endpoint stripe-test-webhook, never membership or live webhook. Recheck HTTP 200 and pending_webhooks=0; also confirm no new course_access for the subscription session. Avoid creating payments or email sends.

## Safeguards
Do not modify live billing, subscriptions, entitlement records, Supabase Free plan, homepage or email flags.

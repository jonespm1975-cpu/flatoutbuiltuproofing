# Priority reconciliation — 13 November 2026

This note records the four requested checks. No Stripe event was retried, no email was sent, and no live payment configuration or checkout code was changed.

## 1. Stripe sandbox event and Supabase reconciliation

- Existing event: `evt_1Ub6xTKS41qhUQTKCAsjwHU2`, `checkout.session.completed`, sandbox (`livemode=false`), subscription mode, GBP 1.99.
- The event was a membership checkout, not a one-time course checkout. The configured course test endpoint `stripe-test-webhook` subscribes to `checkout.session.completed`; the membership endpoint does not subscribe to that event type.
- Supabase Edge logs show three POST responses of HTTP 422 from `stripe-test-webhook` for the event/time window.
- Current deployed `stripe-test-webhook` v25 handles subscription-mode sessions without treating them as course purchases. This source check does not verify a Stripe delivery attempt.
- Supabase contains the matching active sandbox membership; cancellation-at-period-end is true. No course access or purchase-confirmation record was found for this session, and no matching sandbox email retry row was found.
- Stripe still reports one pending webhook for the event. Workbench delivery details and any further reconciliation are blocked by the account passkey challenge. The event was not retried.

## 2. Resend status

- The existing sandbox retry queue has one `accepted` row and no pending rows (read-only database query).
- `accepted` only establishes provider acceptance in the queue record; inbox delivery is not established.
- Resend dashboard access is awaiting user approval of Google sign-in on the user's device (tap **Yes**, then **72**). No resend was attempted.
- Reconcile the provider message status and database row after access is granted.

## 3. Live webhook email failure path

- Current live `stripe-webhook` v31 still performs email delivery synchronously after writing course access and the purchase confirmation. A provider or status-update failure can therefore return HTTP 503 after access has been granted.
- This remains a known live-path defect. No live webhook change was deployed and no live checkout setting changed.
- The separate live email worker/outbox exists, but it is not enough evidence to switch the webhook path: worker runtime flags, HTTP auth behavior, queueing and failure/retry behavior have not all been validated end-to-end.
- Next safe implementation gate: exercise the revised flow in an isolated sandbox function or test harness, prove a durable receipt/outbox and HTTP 2xx despite simulated email failure, then test worker claims/retries without a provider send. Only after those checks should a production code change be considered.

## 4. Concurrency and GitHub HTTP smoke

- Genuine concurrency was **not proven**. Two SQL calls returned the same fixture claim, but measured overlapping-query attempts showed the Supabase SQL connector serialized execution. Separate backend PIDs alone do not prove simultaneous contention.
- The zero-amount synthetic sandbox fixture and queue row used during the attempt were removed; post-cleanup checks found zero receipt, queue and course-access rows for its unique test session. Claim transactions rolled back. No email was sent.
- GitHub Actions run `43258616827` for “Sandbox email worker HTTP smoke” completed successfully on 12 November 2026 at 16:26:06 UTC. Its `smoke` job succeeded, including the step “Unauthenticated endpoint checks (no secrets)”. This is the workflow result; it is distinct from the earlier local DNS-limited attempt.
- Genuine two-connection database contention still needs an execution path that can hold two independent database sessions at the same time.

## Remaining user action

Approve the Google sign-in prompt on the device (“Yes”, then **72**) so Resend's provider-side message status can be checked. Recover Stripe passkey access separately before opening Workbench delivery details.

## Isolated webhook-path validation — 13 November 2026

- Confirmed deployed live webhook remains v31 and still performs a direct Resend POST; no production function or checkout setting was changed.
- Read deployed live checkout v12: it does not write `terms_version` into Stripe session metadata. The atomic fulfilment RPC requires that field, so the proposed replacement webhook would reject a real checkout until the checkout and legal-terms version are coordinated.
- Confirmed database RPC `public.fulfil_live_course_purchase_v4` exists and its receipt INSERT trigger enqueues a pending live outbox row.
- Ran a rollback-only SQL assertion through the RPC with a unique synthetic `cs_live_` session: it wrote one pending receipt and exactly one pending outbox job inside the transaction, preserved the pre-existing entitlement identifier, and completed without email/provider calls. Rolled back; follow-up query found zero receipt and zero outbox jobs for that synthetic session.
- Static checks of the proposed, undeployed webhook v32 passed: it contains no Resend key or send endpoint; it calls the atomic RPC, returns 200 after durable fulfilment, and returns retryable 503 when the RPC fails. This validates the source contract plus the database transaction path, not a signed Stripe end-to-end HTTP event.
- No Supabase development branches exist. None was created because branch creation may incur compute costs and the project is being kept on its Free plan.
- Remaining gate: resolve how the current published terms version is supplied by checkout, then run the full edge-function test in a genuinely disposable environment before deploying any coordinated live code. The proposed webhook and current live checkout remain unchanged.

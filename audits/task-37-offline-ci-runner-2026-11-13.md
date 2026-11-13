# Task 37 — Offline CI runner setup
Date: 2026-11-13 UTC
Status: PARTIAL. CI workflow committed; no successful run or actual test output verified.

Created .github/workflows/task-37-mocked-tests.yml (commit 8a4038026af7c639669303df5436635c7e86f203). On push to workflow or harness paths, GitHub Actions checks out repository, installs Node 22 and TypeScript 5.7.3, then runs tests/task-36-actual-source-harness.cjs. Permissions contents:read, timeout five minutes. No Stripe, Supabase or Resend network calls are requested by test harness. GitHub Actions may need to be enabled.

Reviewed current Task 36 harness and archived Checkout v24/webhook v25 sources via GitHub connector. The harness contains six actual-handler scenarios: existing ownership, pending reservation, Stripe mock creation failure, read-only recovery, mismatched recovered customer, invalid webhook signature. It does NOT yet test valid webhook, duplicate email delivery or concurrent Postgres transactions.

Critical known gap: source webhook checks receipt confirmation_email_status then sends; no verified atomic send lease. Resend Idempotency-Key helps, but cannot alone establish DB-level concurrency safety.

No run logs available through current GitHub connector tools. No assertion pass claims. No code deployed, no SQL mutation, no payments, no sessions, no subscription cancellation changes, no live billing changes, no homepage changes, no Supabase upgrade.

Next: inspect workflow run in GitHub Actions; fix harness if it fails; add valid webhook and duplicate concurrent event scenarios; coordinate a verified DB email lease with retry worker before deployment.

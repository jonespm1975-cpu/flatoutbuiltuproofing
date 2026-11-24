# Checkout test evidence — 24 November 2026

Executed locally using Node.js v22.16.0.

Git blob hashes verified before execution:
- checkout-test.cjs: `96e1eacd218410685f22bb9f8d4b7a98b7e8ed9b`
- stripe-live-checkout.ts: `8a5f2355e0416e3c16ba795db908fedf865b0602`

Command: `node checkout-test.cjs`

Observed stdout: `11 mock scenarios passed; 20 concurrent handler calls, one mock creation`

Exit code: 0.

Scope: actual draft handler executed with simulated Stripe and Supabase dependencies. No external API calls or payments. This is not a PostgreSQL concurrency test or Stripe sandbox integration test. Direct GitHub download in the isolated runtime failed DNS resolution; files were reconstructed from connector retrieval and verified using git hash-object against the retrieved blob hashes.

Release gates still open: independent PostgreSQL concurrency; expired-session and unknown-outcome reconciliation; real Stripe sandbox integration; webhook/email deduplication; existing pre-deployment session reconciliation. Local PostgreSQL executables were not found. No production deployment authorized by this test.

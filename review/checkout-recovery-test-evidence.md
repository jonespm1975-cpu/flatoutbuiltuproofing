# Checkout recovery test evidence — 24 November 2026

Runtime: Node.js v22.16.0. Reconstructed local files from exact connector-retrieved content and verified Git blob hashes using git hash-object:
- stripe-live-checkout.ts: c39809f0b39e29c0e4f3e9623adf35a1caa16a47
- checkout-test.cjs: d51fc5c7af9959a2d4fd2d57feeb1b834df674fb

Executed `node checkout-test.cjs` locally. Exit code 0. Observed stdout:

```
20 mock scenarios passed; 20 concurrent handler calls, one mock creation
```

No assertion failures. No production calls or charges. Scope: actual draft handler with simulated dependencies; mock reservation logic is not evidence of PostgreSQL atomicity. Mock retrieval derives session ID and reservation metadata from current reservation state, so independent identity mismatch and real provider response testing remain required. Incorrect customer test checks retry rejection, not initial creation rejection. Unknown session outcome stays blocked. Still required: actual PostgreSQL concurrency, real Stripe sandbox recovery and signed webhooks, email deduplication, predeployment existing session reconciliation, SDK/API compatibility, production release review. No deployment performed.

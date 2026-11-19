# Task 267 — Advisory lock concurrency probe — 2026-11-13

Two parallel Supabase execute_sql requests each executed pg_try_advisory_xact_lock(26720261113) and pg_sleep(7).

Observed:
- PostgreSQL backend PIDs: 285250 and 285252 (distinct).
- Both returned acquired=true.
- Wall time for Promise.allSettled approximately 16,689 ms.

Interpretation: requests likely serialized at connector or API level. No observed simultaneous contention. This is NOT a passing concurrency test and does NOT demonstrate SKIP LOCKED single-winner claim behavior.

No durable writes, email sending, payment creation, event retry, subscription changes or production deployment.

Recommended next: use two independent direct PostgreSQL connections in a controlled test harness with transaction barriers and synthetic rollback-only email queue rows; record transaction overlap and prove exactly one claim wins. Existing connector does not demonstrate overlapping execution.

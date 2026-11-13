# Task 163 — Mocked sandbox worker integration (2026-11-13)

Created tests/task-163-sandbox-worker.mjs and tests/task-163-sandbox-worker.test.mjs on isolated audit branch. The worker prototype accepts injected database and Resend interfaces and has no network access or actual sending credentials. Thirteen test cases are authored for valid ID, missing claim, live session, sent receipt, wrong terms, wrong/expired token, pending queue, provider rejection, uncertain timeout, missing/invalid provider ID, and failed DB commit.

**Execution limitation:** Attempted to retrieve committed GitHub source to local Node test runtime using raw.githubusercontent.com; local container DNS resolution failed (curl exit 6). Therefore these 13 cases are prepared but NOT verified as executed. Do not claim 13/13 passed. No actual SQL integration or two-connection concurrency test performed.

Read deployed purchase-email-retry-worker v10: ACTIVE but sandbox-dry-run only, sending_enabled=false, claiming_enabled=false, scheduler_enabled=false; it does not send or claim. No deployment or production change.

**Important integration limitation:** The prototype models a leased claim but does not itself claim atomically; actual production integration must call installed internal.claim_sandbox_email_retry_v2 and finish_sandbox_email_retry_v3 through a secure authorized server-side interface and verify true transaction behavior. No Resend request or customer record modification made.

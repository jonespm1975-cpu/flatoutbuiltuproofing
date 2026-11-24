# Postmark course confirmation scheduler

On 24 November 2026 at 19:55 UTC, pg_cron invoked the production worker in authenticated check-only mode. The worker checked the provider and sender configuration and called the actual claim function with a zero limit. It returned HTTP 200, zero claims and sending_enabled=false. The course confirmation queue was empty. The one-time test restored the inactive normal schedule. The normal dispatch function skips the HTTP call when no unattempted pending jobs exist. All six existing worker and sandbox regression cases passed offline.

The dedicated scheduler key is stored in Vault; Edge Functions hold its SHA-256 verifier. No credential values belong in this repository. The staged cadence is once per minute. Activation requires enabling the worker delivery flag and activating the dedicated schedule. The retired sender schedule remains disabled.

#!/usr/bin/env node
/**
 * Read-only smoke tests for the Supabase purchase-email-retry-worker.
 * Usage:
 *   SUPABASE_URL=https://<project>.supabase.co node tests/email-retry-worker-smoke.mjs
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tests/email-retry-worker-smoke.mjs
 * Never place the service-role key in browser code or commit it.
 * No payment, email, queue claim, or mutation is performed.
 */
import assert from "node:assert/strict";

const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
assert(base && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base), "Set a valid SUPABASE_URL");
const endpoint = base + "/functions/v1/purchase-email-retry-worker";
const timeout = AbortSignal.timeout(15000);
const invalid = await fetch(endpoint, { method: "POST", headers: { Authorization: "Bearer invalid-token", "Content-Type": "application/json" }, body: "{}", signal: timeout });
assert.equal(invalid.status, 401, "Invalid service-role credentials must be rejected");
console.log("PASS invalid bearer token rejected (401)");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.log("SKIP authorized dry-run; set SUPABASE_SERVICE_ROLE_KEY locally or in protected CI secrets");
  process.exit(0);
}
const result = await fetch(endpoint, { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(15000) });
assert.equal(result.status, 200, "Authorized dry-run must return HTTP 200");
const data = await result.json();
assert.equal(data.mode, "sandbox-dry-run");
assert.equal(data.sending_enabled, false);
assert.equal(data.claiming_enabled, false);
assert.equal(data.scheduler_enabled, false);
assert.equal(data.action, "none");
assert.equal(data.finish_contract, "internal.finish_sandbox_email_retry_v3");
for (const name of ["queue_records","due_eligible","due_blocked","active_leases","active_leases_missing_token"]) {
  assert(Number.isInteger(data[name]) && data[name] >= 0, name + " must be a nonnegative count");
}
assert(!("lease_token" in data), "Do not expose lease tokens");
console.log("PASS authorized worker is read-only and correctly configured", JSON.stringify({queue_records:data.queue_records,due_eligible:data.due_eligible}));

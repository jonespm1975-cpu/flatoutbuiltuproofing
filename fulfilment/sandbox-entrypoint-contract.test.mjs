import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const path=new URL("../supabase/functions/stripe-24-course-sandbox-webhook/index.ts",import.meta.url);
const source=readFileSync(path,"utf8");
const required=[
 'COURSE_24_SANDBOX_WEBHOOK_ENABLED',
 'COURSE_24_SANDBOX_WEBHOOK_SECRET',
 'COURSE_24_SANDBOX_STRIPE_KEY',
 'COURSE_SANDBOX_CATALOGUE_JSON',
 'record_sandbox_24_course_receipt_v1',
 'constructEventAsync',
 'listLineItems',
 'makeSandboxReceiptAdapter',
 'processSandboxWebhook'
];
for(const item of required)assert.ok(source.includes(item),item);
assert.ok(source.includes('!=="true"')||source.includes('!=="true"'),"disabled by default");
assert.ok(source.includes('sk_test_')&&!source.includes('sk_live_'));
assert.ok(source.includes('event')===false || source.includes('processSandboxWebhook'));
assert.ok(!source.includes('checkout.sessions.create('),"must not create checkout/charge");
assert.ok(!source.includes('from("course_access")'),"must not bypass validated receipt process");
assert.ok(!source.includes('from("purchase_confirmations")'),"must use atomic server RPC");
console.log("PASS: source wiring includes signed webhook, fail-closed catalogue, RPC and avoids payment creation or direct entitlement writes");

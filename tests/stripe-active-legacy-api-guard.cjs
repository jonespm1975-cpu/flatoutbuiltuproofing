// Guard ACTIVE checkout sources against Stripe token/source-backed Charges APIs.
// Not a replacement for Stripe Workbench request logs (which can show other clients).
const fs=require("node:fs"),assert=require("node:assert/strict");
const files=[
 "supabase/functions/stripe-live-checkout/index.ts",
 "supabase/functions/stripe-webhook/index.ts",
 "purchase-checkout.js",
 "auth.js"
];
const banned=[
 [/\.charges\s*\.\s*create\s*\(/gi,"direct Charges.create"],
 [/\.sources\s*\.\s*create\s*\(/gi,"legacy Sources.create"],
 [/\.tokens\s*\.\s*create\s*\(/gi,"legacy Tokens.create"],
 [/\bcreateToken\s*\(/gi,"Stripe.js tokenization"],
 [/\bstripe\.createSource\s*\(/gi,"Stripe.js source creation"],
 [/\b(?:card\s*:\s*['\"]tok_|source\s*:\s*['\"]tok_)/gi,"raw card tokens on charge/customer"],
 [/\b(?:Stripe\.setApiKey|stripe\.api_key\s*=)\b/gi,"deprecated module-global Stripe key"]
];
let tested=0;
for(const file of files){
 const code=fs.readFileSync(file,"utf8");
 for(const [pattern,description] of banned){
  const results=[...code.matchAll(pattern)];
  assert.equal(results.length,0,file+" includes prohibited "+description);
 }
 console.log("PASS no deprecated Charges/token API source",file);
 tested++;
}
const checkout=fs.readFileSync(files[0],"utf8");
const webhook=fs.readFileSync(files[1],"utf8");
assert.ok(checkout.includes("checkout.sessions.create("),"Checkout Sessions create missing");
assert.ok(webhook.includes("constructEventAsync("),"Signed Stripe webhook verification missing");
assert.ok(webhook.includes('checkout.session.completed'),"Successful Checkout webhook missing");
assert.ok(webhook.includes("checkout.session.async_payment_succeeded"),"Async success webhook missing");
console.log("PASS "+tested+" current active source files use modern checkout + signature verification");
console.log("NOTE: This does NOT identify the origin of past Stripe legacy API warning; inspect Workbench requests.");

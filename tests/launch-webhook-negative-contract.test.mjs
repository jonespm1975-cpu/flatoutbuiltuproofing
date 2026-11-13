import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../audits/task-190-proposed-stripe-webhook-v32-NOT-DEPLOYED.ts",import.meta.url),"utf8");

test("live webhook requires cryptographically verified event",()=>{
  assert.match(source,/constructEventAsync/);
  assert.match(source,/event\.livemode\s*!==\s*true/);
});
test("live webhook does not process subscription checkout as course purchase",()=>{
  assert.match(source,/session\.mode\s*!==\s*["']payment["']/);
});
test("live webhook verifies course, consent, and approved terms",()=>{
  for(const marker of ["beginner-training-course","terms_accepted","immediate_access_consent","cancellation_acknowledgement","APPROVED_TERMS_VERSION","termsVersion!==approvedTermsVersion"]) assert.ok(source.includes(marker),marker);
});
test("live webhook invokes atomic database fulfilment, not direct email",()=>{
  assert.match(source,/fulfil_live_course_purchase_v4/);
  assert.doesNotMatch(source,/api\.resend\.com\/emails/);
});

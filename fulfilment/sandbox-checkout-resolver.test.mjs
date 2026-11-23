import {validateCatalogue,prepareSandboxCheckout} from "./sandbox-checkout-resolver.mjs";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const catalogue=JSON.parse(readFileSync(new URL("./course-catalogue.v1.json",import.meta.url),"utf8"));
const valid=validateCatalogue(catalogue);
assert.equal(valid.ok,true);
assert.equal(valid.count,24);
assert.equal(valid.enabled,0);
const userId="11111111-1111-4111-8111-111111111111",consent={terms_accepted:true,immediate_access_consent:true,cancellation_acknowledgement:true};
for(const row of catalogue.courses){
 assert.equal(prepareSandboxCheckout({catalogue,userId,consent,courseId:row.course_id}).ok,false);
}
assert.equal(prepareSandboxCheckout({catalogue,userId,consent,courseId:"not-a-course"}).reason,"unknown_course");
const clone=structuredClone(catalogue),first=clone.courses[0],second=clone.courses[1];
first.status="published";first.content_status="verified";first.checkout_enabled=true;first.stripe_price_id_test="price_test_unique_first";
assert.equal(validateCatalogue(clone).ok,true);
const plan=prepareSandboxCheckout({catalogue:clone,courseId:first.course_id,userId,consent});
assert.equal(plan.ok,true);assert.equal(plan.priceId,"price_test_unique_first");assert.equal(plan.unitAmount,999);
assert.equal(prepareSandboxCheckout({catalogue:clone,courseId:first.course_id,userId,consent,alreadyOwned:true}).reason,"already_owned");
assert.equal(prepareSandboxCheckout({catalogue:clone,courseId:first.course_id,userId,consent:{...consent,terms_accepted:false}}).reason,"consent_missing");
assert.equal(prepareSandboxCheckout({catalogue:clone,courseId:first.course_id,userId:"not-user",consent}).reason,"authenticated_user_required");
second.status="published";second.content_status="verified";second.checkout_enabled=true;second.stripe_price_id_test=first.stripe_price_id_test;
assert.equal(validateCatalogue(clone).reason,"duplicate_sandbox_price");
console.log("PASS: all 24 disabled courses rejected, unique price mapping, ownership, user and consent gating");

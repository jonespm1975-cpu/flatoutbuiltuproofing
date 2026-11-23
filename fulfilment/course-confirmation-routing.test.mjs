import {buildCourseConfirmation,planOwnedCourseAccess} from "./course-confirmation-routing.mjs";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const catalog=JSON.parse(readFileSync(new URL("./course-catalogue.v1.json",import.meta.url),"utf8"));
const user="11111111-1111-4111-8111-111111111111";
const received=[],owned=[];
for(const [i,course] of catalog.courses.entries()){
 const receipt={stripe_checkout_session_id:"cs_test_course"+i,user_id:user,course_id:course.course_id,paid_amount_pence:999,currency:"gbp",terms_version:"staging-24-course-v1"};
 const conf=buildCourseConfirmation({receipt,catalogue:catalog});
 assert.equal(conf.ok,true);assert.equal(conf.confirmation.course_title,course.title);
 assert.equal(conf.confirmation.idempotency_key,"course-confirmation-"+receipt.stripe_checkout_session_id);
 const plan=planOwnedCourseAccess({receipt,existingEntitlements:owned});
 assert.equal(plan.ok,true);assert.equal(plan.already_owned,false);
 owned.push({user_id:user,course_id:course.course_id});
 assert.equal(planOwnedCourseAccess({receipt,existingEntitlements:owned}).already_owned,true);
 received.push(conf.confirmation);
}
assert.equal(received.length,24);
assert.equal(new Set(received.map(r=>r.idempotency_key)).size,24);
assert.equal(buildCourseConfirmation({receipt:{stripe_checkout_session_id:"cs_live_wrong"},catalogue:catalog}).ok,false);
assert.equal(planOwnedCourseAccess({receipt:{course_id:"beginner-training-course",stripe_checkout_session_id:"cs_test_bad"}}).ok,false);
console.log("PASS: 24 trusted course emails and separate entitlements; duplicate ownership and invalid receipt rejected");

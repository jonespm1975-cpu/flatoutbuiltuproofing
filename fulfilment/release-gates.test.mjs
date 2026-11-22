import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {COURSE_IDS,assessTwentyFourCourseRelease} from "./release-gates.mjs";
const live=JSON.parse(readFileSync(new URL("./course-catalogue.v1.json",import.meta.url),"utf8"));
assert.equal(COURSE_IDS.length,24);
const current=assessTwentyFourCourseRelease({catalogue:live});
assert.equal(current.ready,false);
assert.equal(current.counts.ready,0);
assert.equal(current.failures.filter(x=>x.endsWith(":qualified_technical_signoff_missing")).length,24);
assert.equal(current.failures.filter(x=>x.endsWith(":both_stripe_prices_missing")).length,24);
const rows=structuredClone(live);
const evidence={},prices={},global={};
for(const row of rows.courses){
 row.status="published";row.content_status="verified";row.checkout_enabled=true;
 evidence[row.course_id]={qualified_reviewer:"Competent reviewer example",manufacturer_or_system:"Example product system",
  document_revision:"2026-11",signed_review_reference:"example-doc-"+row.course_id,approval_status:"approved",
  drawing_verified:true,assessment_verified:true};
 prices[row.course_id]={
  test:{id:"price_test"+row.course_id.replaceAll("-",""),currency:"gbp",amount_pence:999,type:"one_time",environment:"test"},
  live:{id:"price_live"+row.course_id.replaceAll("-",""),currency:"gbp",amount_pence:999,type:"one_time",environment:"live"}
 };
}
for(const key of ["isolated_supabase_sandbox","real_signed_stripe_test_webhook",
 "atomic_two_connection_db_test","purchased_course_only_access","unowned_course_denial",
 "provider_confirmed_test_email","gb_eligibility_checked","legal_consent_checked","no_public_paid_content"])global[key]=true;
const input={catalogue:rows,technicalEvidence:evidence,priceEvidence:prices,environmentEvidence:global,ownerFinalApproval:true};
assert.equal(assessTwentyFourCourseRelease(input).ready,true);
delete evidence[COURSE_IDS[0]].signed_review_reference;
assert.equal(assessTwentyFourCourseRelease(input).ready,false);
evidence[COURSE_IDS[0]].signed_review_reference="example-doc-"+COURSE_IDS[0];
prices[COURSE_IDS[1]].test=structuredClone(prices[COURSE_IDS[0]].test);
assert.equal(assessTwentyFourCourseRelease(input).ready,false);
prices[COURSE_IDS[1]].test.id="price_testunique0001";
global.provider_confirmed_test_email=false;
assert.equal(assessTwentyFourCourseRelease(input).ready,false);
global.provider_confirmed_test_email=true;
rows.courses[0].status="planned";
assert.equal(assessTwentyFourCourseRelease(input).ready,false);
console.log("PASS: actual 24 courses remain disabled; release requires signed QA, 48 distinct prices, sandbox evidence and final owner approval");

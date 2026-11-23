import {COURSES,validateCoursePayment} from "./validate-course-payment.mjs";
import assert from "node:assert/strict";
assert.equal(COURSES.length,24);
assert.equal(new Set(COURSES).size,24);
const user="11111111-1111-4111-8111-111111111111";
const configs=Object.fromEntries(COURSES.map(id=>[id,{status:"published",checkout_enabled:true,content_verified:true,price_id:"price_unique_"+id}]));
const base={event:{type:"checkout.session.completed",livemode:false},session:{id:"cs_test_example",livemode:false,mode:"payment",payment_status:"paid",currency:"gbp",amount_subtotal:999,amount_total:999,client_reference_id:user,metadata:{supabase_user_id:user,terms_accepted:"true",immediate_access_consent:"true",cancellation_acknowledgement:"true",consent_recorded_at:"2026-11-21T12:00:00Z"}},courseConfig:configs,expectedLivemode:false};
for(const id of COURSES){
 const session={...base.session,metadata:{...base.session.metadata,course_id:id}};
 const valid=validateCoursePayment({...base,session,lineItems:[{price:{id:configs[id].price_id},quantity:1}]});
 assert.equal(valid.ok,true,id);
 assert.equal(valid.course_id,id);
 assert.equal(validateCoursePayment({...base,session,lineItems:[{price:{id:"price_wrong"},quantity:1}]}).ok,false);
 assert.equal(validateCoursePayment({...base,session:{...session,payment_status:"unpaid"},lineItems:[{price:{id:configs[id].price_id},quantity:1}]}).ok,false);
 assert.equal(validateCoursePayment({...base,session,courseConfig:{...configs,[id]:{...configs[id],content_verified:false}},lineItems:[{price:{id:configs[id].price_id},quantity:1}]}).ok,false);
}
assert.equal(validateCoursePayment({...base,session:{...base.session,metadata:{...base.session.metadata,course_id:"unknown"}},lineItems:[]}).ok,false);
// Isolate test/live Session IDs, even when the session livemode flag is malformed.
const first=COURSES[0], second=COURSES[1];
const correctSession={...base.session,metadata:{...base.session.metadata,course_id:first}};
const correctItems=[{price:{id:configs[first].price_id},quantity:1}];
assert.equal(validateCoursePayment({...base,session:{...correctSession,id:"cs_live_invalid"},lineItems:correctItems}).ok,false);
assert.equal(validateCoursePayment({...base,session:correctSession,lineItems:correctItems,courseConfig:{...configs,[second]:{...configs[second],price_id:configs[first].price_id}}}).ok,false);
assert.equal(validateCoursePayment({...base,session:{...correctSession,metadata:{...correctSession.metadata,course_id:second}},lineItems:correctItems}).ok,false);
console.log("PASS: all 24 positive cases and fail-closed negative cases, environment prefix, duplicate mapping, cross-course isolation.");

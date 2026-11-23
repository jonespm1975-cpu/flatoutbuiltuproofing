import {prepareFulfilmentRecord} from "./prepare-fulfilment-record.mjs";
import {COURSES} from "./validate-course-payment.mjs";
import assert from "node:assert/strict";
const userId="11111111-1111-4111-8111-111111111111";
const cfg=Object.fromEntries(COURSES.map(id=>[id,{status:"published",content_verified:true,checkout_enabled:true,price_id:"price_test_"+id}]));
const titles=Object.fromEntries(COURSES.map(id=>[id,"Course "+id]));
for(const id of COURSES){
 const event={livemode:false,type:"checkout.session.async_payment_succeeded"};
 const session={id:"cs_test_"+id,livemode:false,mode:"payment",payment_status:"paid",currency:"gbp",amount_subtotal:999,amount_total:999,client_reference_id:userId,metadata:{course_id:id,supabase_user_id:userId,terms_accepted:"true",immediate_access_consent:"true",cancellation_acknowledgement:"true",consent_recorded_at:"2026-11-21T12:00:00Z"}};
 const lineItems=[{price:{id:cfg[id].price_id},quantity:1}];
 const good=prepareFulfilmentRecord({event,session,lineItems,courseConfig:cfg,courseTitles:titles});
 assert.equal(good.ok,true,id);assert.equal(good.record.course_id,id);assert.equal(good.record.course_title,titles[id]);
 assert.equal(prepareFulfilmentRecord({event,session,lineItems,courseConfig:cfg,courseTitles:{}}).ok,false);
 assert.equal(prepareFulfilmentRecord({event,session:{...session,payment_status:"unpaid"},lineItems,courseConfig:cfg,courseTitles:titles}).ok,false);
 assert.equal(prepareFulfilmentRecord({event,session,lineItems:[{price:{id:"price_other"},quantity:1}],courseConfig:cfg,courseTitles:titles}).ok,false);
}
console.log("PASS: 24 course receipt-routing cases, trusted title, paid status and course-price isolation");

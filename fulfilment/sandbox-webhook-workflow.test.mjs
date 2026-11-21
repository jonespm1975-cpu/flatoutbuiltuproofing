import {processSandboxWebhook} from "./sandbox-webhook-workflow.mjs";
import {COURSES} from "./validate-course-payment.mjs";
import assert from "node:assert/strict";
const user="11111111-1111-4111-8111-111111111111";
const cfg=Object.fromEntries(COURSES.map(id=>[id,{status:"published",checkout_enabled:true,content_verified:true,price_id:"price_test_"+id}]));
const titles=Object.fromEntries(COURSES.map(id=>[id,"Course "+id]));
const stored=new Map(), writes=new Map();
const base={signature:"t=123,v1=placeholder",rawBody:"SIGNED_ONLY",courseConfig:cfg,courseTitles:titles};
function eventFor(id,paid=true){
 return {id:"evt_"+id,livemode:false,type:"checkout.session.completed",data:{object:{
  id:"cs_test_"+id,livemode:false,mode:"payment",payment_status:paid?"paid":"unpaid",currency:"gbp",amount_subtotal:999,amount_total:999,
  client_reference_id:user,metadata:{course_id:id,supabase_user_id:user,terms_accepted:"true",immediate_access_consent:"true",cancellation_acknowledgement:"true",consent_recorded_at:"2026-11-21T12:00:00Z"}
 }}};
}
const adapters=(event)=>({...base,verifySignedEvent:async()=>event,getLineItems:async()=>[{price:{id:cfg[event.data.object.metadata.course_id]?.price_id},quantity:1}],persistConfirmation:async(record)=>{
 const key=record.stripe_checkout_session_id;writes.set(key,(writes.get(key)||0)+1);
 if(stored.has(key)) return {status:"already_recorded",record:stored.get(key)};
 stored.set(key,record);return {status:"inserted"};
}});
for(const id of COURSES){
 const event=eventFor(id),a=adapters(event);
 assert.equal((await processSandboxWebhook(a)).code,"recorded");
 assert.equal((await processSandboxWebhook(a)).code,"duplicate_acknowledged");
 assert.equal(stored.get("cs_test_"+id).course_id,id);
 assert.equal((await processSandboxWebhook({...a,verifySignedEvent:async()=>{throw Error("wrong signature")}})).status,400);
 assert.equal((await processSandboxWebhook(adapters(eventFor(id,false)))).code,"awaiting_payment");
}
assert.equal(stored.size,24);
const invalid=eventFor(COURSES[0]);
assert.equal((await processSandboxWebhook({...adapters(invalid),getLineItems:async()=>[{price:{id:"price_wrong"},quantity:1}]})).status,422);
assert.equal((await processSandboxWebhook({...adapters(invalid),persistConfirmation:async()=>({status:"already_recorded",record:{course_id:"other"}})})).status,503);
assert.equal((await processSandboxWebhook({...adapters(invalid),persistConfirmation:async()=>{throw Error("db error")}})).status,503);
assert.equal((await processSandboxWebhook({...adapters(invalid),verifySignedEvent:async()=>({...invalid,livemode:true})})).status,400);
assert.equal((await processSandboxWebhook({...adapters(invalid),verifySignedEvent:async()=>({...invalid,type:"customer.created"})})).code,"ignored_event");
console.log("PASS: 24 mock verified-event routes, duplicates, unpaid, bad signature, bad price, DB error and live/test isolation");

import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {prepareSandboxCheckout} from "./sandbox-checkout-resolver.mjs";
import {processSandboxWebhook} from "./sandbox-webhook-workflow.mjs";
import {makeSandboxReceiptAdapter} from "./sandbox-receipt-adapter.mjs";
import {buildCourseConfirmation,planOwnedCourseAccess} from "./course-confirmation-routing.mjs";

// Mock integrated test. No real Stripe signatures, Postgres transactions, email, or payments.
const catalogue=JSON.parse(readFileSync(new URL("./course-catalogue.v1.json",import.meta.url),"utf8"));
for(const c of catalogue.courses){
 c.status="published";c.content_status="verified";c.checkout_enabled=true;
 c.stripe_price_id_test="price_test_mock_"+c.course_id;
}
const config=Object.fromEntries(catalogue.courses.map(c=>[c.course_id,{status:"published",checkout_enabled:true,content_verified:true,price_id:c.stripe_price_id_test}]));
const titles=Object.fromEntries(catalogue.courses.map(c=>[c.course_id,c.title]));
const uid="11111111-1111-4111-8111-111111111111";
const consent={terms_accepted:true,immediate_access_consent:true,cancellation_acknowledgement:true};
const confirmed=new Map(),entitlements=new Map(),sent=new Map();
const record=makeSandboxReceiptAdapter(async (entry)=>{
 const old=confirmed.get(entry.stripe_checkout_session_id);
 if(old) return {status:"already_recorded",record:old};
 confirmed.set(entry.stripe_checkout_session_id,entry);
 return {status:"inserted",record:entry};
});
for(const [idx,c] of catalogue.courses.entries()){
 const checkout=prepareSandboxCheckout({catalogue,courseId:c.course_id,userId:uid,consent});
 assert.equal(checkout.ok,true,c.course_id);
 const id="cs_test_integrated_"+idx;
 const event={id:"evt_test_integrated_"+idx,type:"checkout.session.completed",livemode:false,data:{object:{
    id,livemode:false,mode:"payment",payment_status:"paid",currency:"gbp",amount_subtotal:999,amount_total:999,
    client_reference_id:uid,metadata:{course_id:c.course_id,supabase_user_id:uid,
      terms_accepted:"true",immediate_access_consent:"true",cancellation_acknowledgement:"true",
      consent_recorded_at:"2026-11-21T12:00:00Z"}
 }}};
 const adapters={rawBody:"mock signed body",signature:"mock signature",courseConfig:config,courseTitles:titles,
   verifySignedEvent:async()=>event,
   getLineItems:async()=>[{price:{id:c.stripe_price_id_test},quantity:1}],
   persistConfirmation:record
 };
 const first=await processSandboxWebhook(adapters);
 assert.equal(first.code,"recorded");
 const replay=await processSandboxWebhook(adapters);
 assert.equal(replay.code,"duplicate_acknowledged");
 const receipt=confirmed.get(id);
 const email=buildCourseConfirmation({receipt,catalogue});
 assert.equal(email.ok,true);
 assert.equal(email.confirmation.course_title,c.title);
 sent.set(email.confirmation.idempotency_key,email.confirmation);
 const entitlement=planOwnedCourseAccess({receipt,existingEntitlements:[...entitlements.values()]});
 assert.equal(entitlement.ok,true);
 assert.equal(entitlement.already_owned,false);
 entitlements.set(uid+"|"+c.course_id,{user_id:uid,course_id:c.course_id});
 assert.equal(planOwnedCourseAccess({receipt,existingEntitlements:[...entitlements.values()]}).already_owned,true);
 // Buying course N must never unlock course N+1.
 const next=catalogue.courses[idx+1];
 if(next) assert.equal(entitlements.has(uid+"|"+next.course_id),false);
 // Webhook paid status gates fulfilment.
 assert.equal((await processSandboxWebhook({...adapters,verifySignedEvent:async()=>({...event,data:{object:{...event.data.object,payment_status:"unpaid"}}})})).code,"awaiting_payment");
}
assert.equal(confirmed.size,24);
assert.equal(sent.size,24);
assert.equal(entitlements.size,24);
assert.equal(sent.get("course-confirmation-cs_test_integrated_0").course_id,catalogue.courses[0].course_id);
console.log("PASS: 24 mocked checkout-to-webhook-to-receipt-to-email-to-entitlement flows, duplicate deliveries and isolation");

/** Genuine Stripe SDK signature verification + disposable PostgreSQL integration.
 * Stripe events are locally signed using Stripe's own test-header helper.
 * Stripe API/Checkout are NOT called; prices and line-items are mocked.
 */
import assert from "node:assert/strict";
import Stripe from "stripe";
import pg from "pg";
import {COURSES} from "./validate-course-payment.mjs";
import {processSandboxWebhook} from "./sandbox-webhook-workflow.mjs";
import {makeSandboxReceiptAdapter} from "./sandbox-receipt-adapter.mjs";

const stripe=new Stripe("sk_test_ci_dummy_not_an_api_key",{apiVersion:"2026-11-18.endive"});
const secret="whsec_ci_signature_test_only_not_used_by_production";
const pool=new pg.Pool({connectionString:process.env.CI_POSTGRES_URL,max:4,connectionTimeoutMillis:5000});
const uid="33333333-3333-4333-8333-333333333333";
const configs=Object.fromEntries(COURSES.map(id=>[id,{status:"published",checkout_enabled:true,content_verified:true,price_id:"price_ci_"+id}]));
const titles=Object.fromEntries(COURSES.map(id=>[id,"Course "+id]));
const writes=makeSandboxReceiptAdapter(async(record)=>{
 const client=await pool.connect();
 try{
  const result=await client.query("select ci_fulfilment.record_paid_sandbox_order($1,$2,$3) as status",
     [record.stripe_checkout_session_id,record.user_id,record.course_id]);
  const state=result.rows[0]?.status;
  if(state==="inserted")return {status:state};
  if(state==="already_recorded"){
   const existing=await client.query("select session_id,user_id::text,course_id,amount_pence,currency from ci_fulfilment.receipts where session_id=$1",[record.stripe_checkout_session_id]);
   const row=existing.rows[0];
   return {status:state,record:{stripe_checkout_session_id:row.session_id,user_id:row.user_id,course_id:row.course_id,paid_amount_pence:row.amount_pence,currency:row.currency,terms_version:record.terms_version}};
  }
  throw Error("Unexpected database result");
 } finally {client.release();}
});
let signedCount=0;
function signedPayload(id,i,overrides={}){
 const event={
  id:"evt_ci_"+i,object:"event",type:"checkout.session.completed",livemode:false,
  data:{object:{
   id:"cs_test_signed_"+i,object:"checkout.session",livemode:false,mode:"payment",
   payment_status:"paid",amount_subtotal:999,amount_total:999,currency:"gbp",
   client_reference_id:uid,metadata:{
    course_id:id,supabase_user_id:uid,immediate_access_consent:"true",
    cancellation_acknowledgement:"true",terms_accepted:"true",
    consent_recorded_at:"2026-11-21T12:00:00Z"
   },...overrides
  }}
 };
 const rawBody=JSON.stringify(event);
 const signature=stripe.webhooks.generateTestHeaderString({payload:rawBody,secret});
 return {rawBody,signature};
}
const mkOpts=(id,i,data)=>({
 ...data,courseConfig:configs,courseTitles:titles,
 verifySignedEvent:async(body,sig)=>stripe.webhooks.constructEvent(body,sig,secret),
 getLineItems:async()=>[{price:{id:configs[id].price_id},quantity:1}],
 persistConfirmation:writes
});
try{
 for(const [i,id] of COURSES.entries()){
  const data=signedPayload(id,i);
  const opts=mkOpts(id,i,data);
  const one=await processSandboxWebhook(opts);
  assert.equal(one.code,"recorded",id);
  const again=await processSandboxWebhook(opts);
  assert.equal(again.code,"duplicate_acknowledged",id);
  signedCount++;
  const invalid=await processSandboxWebhook({...opts,rawBody:data.rawBody+" "});
  assert.equal(invalid.status,400,"modified payload must invalidate Stripe signature");
 }
 const wrongPrice=await processSandboxWebhook({...mkOpts(COURSES[0],0,signedPayload(COURSES[0],0)),getLineItems:async()=>[{price:{id:"price_wrong"},quantity:1}]});
 assert.equal(wrongPrice.status,422);
 const unpaid=await processSandboxWebhook(mkOpts(COURSES[0],999,signedPayload(COURSES[0],999,{payment_status:"unpaid"})));
 assert.equal(unpaid.code,"awaiting_payment");
 const rows=await pool.query("select (select count(*) from ci_fulfilment.receipts) receipts,(select count(*) from ci_fulfilment.entitlements) entitlements,(select count(*) from ci_fulfilment.outbox) outbox");
 assert.deepEqual(Object.values(rows.rows[0]).map(Number),[49,49,49],"25 earlier rows + 24 signed events");
 console.log("PASS: 24 Stripe SDK cryptographically verified fixture events; 24 idempotent replays; tamper, unpaid, wrong-price rejected; 49 DB records across all tests.");
}finally{await pool.end();}

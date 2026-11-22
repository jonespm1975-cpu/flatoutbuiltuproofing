import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runSandboxConfirmationBatch} from "./sandbox-confirmation-worker.mjs";
const catalogue=JSON.parse(readFileSync(new URL("./course-catalogue.v1.json",import.meta.url),"utf8"));
const user="11111111-1111-4111-8111-111111111111";
const record=(idx)=>({stripe_checkout_session_id:"cs_test_course_"+idx,course_id:catalogue.courses[idx].course_id,user_id:user,
  paid_amount_pence:999,currency:"gbp",terms_version:"staging-24-course-v1"});
const states=new Map(),delivered=new Set(),claimed=new Set();
let calls=0;
async function worker(indices,simulateFailure=false){
 return runSandboxConfirmationBatch({catalogue,maxJobs:2,
   claimDue:async()=>indices.map(i=>{
     const id=record(i).stripe_checkout_session_id;
     if(claimed.has(id))throw Error("duplicate lease");
     claimed.add(id);return {session_id:id,claim_token:"claimed-test-token-"+i};
   }),
   loadReceipt:async(id)=>record(Number(id.split("_").at(-1))),
   loadCustomerEmail:async()=> "customer@example.test",
   sendConfirmation:async(d)=>{
     calls++;
     if(simulateFailure)throw Error("provider unavailable");
     if(delivered.has(d.idempotencyKey))return {accepted:false};
     delivered.add(d.idempotencyKey);
     return {accepted:true,provider_id:"resend-mock-"+d.courseId};
   },
   finishClaim:async({sessionId,claimToken,status})=>{
     if(!claimed.has(sessionId)||!claimToken.startsWith("claimed-test-token-"))return {committed:false};
     states.set(sessionId,status);return {committed:true};
   }
 });
}
for(let i=0;i<24;i+=2){
 const r=await worker([i,i+1]);assert.equal(r.accepted,2);assert.equal(r.finish_errors,0);
}
assert.equal(delivered.size,24);assert.equal(calls,24);assert.equal(states.size,24);
const fail=await worker([],true);assert.equal(fail.accepted,0);
const invalid=await runSandboxConfirmationBatch({catalogue});assert.equal(invalid.ok,false);
const receipt=record(0);
assert.equal(receipt.course_id,"built-up-01");
// Simulate a distinct leased session whose provider rejects; it must be recorded as rejected.
const rejection=await runSandboxConfirmationBatch({catalogue,maxJobs:1,
 claimDue:async()=>[{session_id:"cs_test_retry_new",claim_token:"retry-token-long-123"}],
 loadReceipt:async()=>({...record(0),stripe_checkout_session_id:"cs_test_retry_new"}),
 loadCustomerEmail:async()=> "customer@example.test",
 sendConfirmation:async()=>{throw Error("offline")},
 finishClaim:async({status,errorCode})=>{assert.equal(status,"uncertain");assert.equal(errorCode,"provider_response_ambiguous");return {committed:true}}
});
assert.equal(rejection.uncertain,1);assert.equal(rejection.rejected,0);assert.equal(rejection.accepted,0);
// Stale claim token must not be acknowledged as a successful send.
const stale=await runSandboxConfirmationBatch({catalogue,maxJobs:1,
 claimDue:async()=>[{session_id:"cs_test_stale",claim_token:"expired-token-long-123"}],
 loadReceipt:async()=>({...record(0),stripe_checkout_session_id:"cs_test_stale"}),
 loadCustomerEmail:async()=> "customer@example.test",
 sendConfirmation:async()=>({accepted:true,provider_id:"provider-accepted-example"}),
 finishClaim:async()=>({committed:false})
});
assert.equal(stale.finish_errors,1);assert.equal(stale.accepted,0);
// A definite validation failure happens before send and may be rejected normally.
const noEmail=await runSandboxConfirmationBatch({catalogue,maxJobs:1,
 claimDue:async()=>[{session_id:"cs_test_missing_recipient",claim_token:"missing-email-token-123"}],
 loadReceipt:async()=>({...record(0),stripe_checkout_session_id:"cs_test_missing_recipient"}),
 loadCustomerEmail:async()=>null,
 sendConfirmation:async()=>{throw Error("must not send")},
 finishClaim:async({status,errorCode})=>{assert.equal(status,"rejected");assert.equal(errorCode,"verified_customer_email_missing");return {committed:true}}
});
assert.equal(noEmail.rejected,1);assert.equal(noEmail.uncertain,0);
// A provider response lacking acceptance proof also needs manual reconciliation.
const ambiguous=await runSandboxConfirmationBatch({catalogue,maxJobs:1,
 claimDue:async()=>[{session_id:"cs_test_ambiguous",claim_token:"ambiguous-token-1234"}],
 loadReceipt:async()=>({...record(0),stripe_checkout_session_id:"cs_test_ambiguous"}),
 loadCustomerEmail:async()=> "customer@example.test",
 sendConfirmation:async()=>({accepted:false}),
 finishClaim:async({status,errorCode})=>{assert.equal(status,"uncertain");assert.equal(errorCode,"provider_acceptance_unconfirmed");return {committed:true}}
});
assert.equal(ambiguous.uncertain,1);
console.log("PASS: 24 course-specific emails; provider ambiguity quarantined; pre-send failure safe; stale lease guarded");

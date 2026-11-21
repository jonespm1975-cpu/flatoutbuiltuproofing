import {makeSandboxReceiptAdapter} from "./sandbox-receipt-adapter.mjs";
import assert from "node:assert/strict";
const users=["11111111-1111-4111-8111-111111111111","22222222-2222-4222-8222-222222222222"];
const ids=["built-up","tile-slate","metal-sheet","liquid-applied"].flatMap(prefix=>Array.from({length:6},(_,i)=>prefix+"-"+String(i+1).padStart(2,"0")));
const receipts=new Map(),insertions=new Map();
const recordFn=async(input)=>{
  const key=input.stripe_checkout_session_id;
  if(receipts.has(key)) return {status:"already_recorded",record:receipts.get(key)};
  receipts.set(key,input);insertions.set(key,1);return {status:"inserted",record:input};
};
const persist=makeSandboxReceiptAdapter(recordFn);
const base=(id,n,uid=users[0])=>({stripe_checkout_session_id:"cs_test_order"+n,user_id:uid,course_id:id,paid_amount_pence:999,currency:"gbp",consent_recorded_at:"2026-11-21T12:00:00Z",terms_version:"staging-24-course-v1",course_title:"Untrusted title discarded"});
for(const [i,id] of ids.entries()){
 const record=base(id,i);
 assert.equal((await persist(record,"evt_test"+i)).status,"inserted");
 assert.equal((await persist(record,"evt_replay"+i)).status,"already_recorded");
 assert.equal(receipts.get(record.stripe_checkout_session_id).course_id,id);
 assert.equal("course_title" in receipts.get(record.stripe_checkout_session_id),false);
}
assert.equal(receipts.size,24);
await assert.rejects(persist(base(ids[1],0,users[1]),"evt_collision"),/Conflicting receipt identity/);
await assert.rejects(persist(base("unknown-course",333),"evt_unknown"),/Untrusted/);
await assert.rejects(persist({...base(ids[0],333),paid_amount_pence:1000},"evt_wrongprice"),/Untrusted/);
await assert.rejects(persist({...base(ids[0],333),stripe_checkout_session_id:"cs_live_wrong"},"evt_wrongenv"),/Untrusted/);
await assert.rejects(persist({...base(ids[0],333),terms_version:"sandbox-test"},"evt_wrongterms"),/Untrusted/);
await assert.rejects(persist(base(ids[0],333),"bad_event"),/Untrusted/);
await assert.rejects(makeSandboxReceiptAdapter(async()=>({status:"unknown"}))(base(ids[0],333),"evt_fail"),/not committed/);
console.log("PASS: 24 mock inserts, 24 idempotent replays, cross-user collision rejected, 6 invalid input cases");

// Verify actual STAGED delivery/bounce webhook source with fake Postmark payloads.
// Postmark currently supports HTTP Basic Authentication, not native HMAC signatures.
// No provider network requests, actual purchase data, email sending or DB access.
const fs=require("node:fs"),vm=require("node:vm"),ts=require("typescript");
const assert=require("node:assert/strict");
const {webcrypto}=require("node:crypto");
const c=fs.readFileSync("supabase/functions/future-confirmation-delivery-webhook/index.ts","utf8")
 .replace('from "npm:@supabase/supabase-js@2.49.4"','from "supabase-fixture"');
const js=ts.transpileModule(c,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
const event={
 RecordType:"Delivery",MessageID:"postmark-fixture-id",
 Recipient:"course-account@example.invalid",
 DeliveredAt:"2026-11-23T20:10:00Z",
 Tag:"one-off-course-contract-confirmation",MessageStream:"outbound"
};
const auth="Basic "+Buffer.from("postmark-hook-fixture:distinct-secret-123").toString("base64");
function harness(opts={}){
 let handler,dbCalls=[];
 const env={
  FUTURE_CONFIRMATION_WEBHOOK_USER:"postmark-hook-fixture",
  FUTURE_CONFIRMATION_WEBHOOK_PASSWORD:"distinct-secret-123",
  FUTURE_CONFIRMATION_WEBHOOK_ENABLED:opts.disabled?"false":"true",
  SUPABASE_URL:"https://example.invalid",SUPABASE_SERVICE_ROLE_KEY:"service_role_fixture"
 };
 const createClient=()=>({rpc:async(name,params)=>{
  assert.equal(name,"record_future_contract_delivery");
  dbCalls.push(params);
  return {data:opts.dbNoMatch?false:true,error:opts.dbError?{message:"down"}:null};
 }});
 const sandbox={exports:{},require:p=>p==="supabase-fixture"?{createClient}:null,
  Deno:{serve:fn=>handler=fn,env:{get:k=>env[k]}},
  crypto:webcrypto,TextEncoder,Uint8Array,Request,Response,Headers,JSON,Date,console,atob
 };
 vm.runInNewContext(js,sandbox,{timeout:4000});
 const request=(payload=event,options={})=>{
  const method=options.method||"POST";
  const headers={"content-type":"application/json"};
  if(!options.noAuth)headers.authorization=options.badAuth?"Basic "+Buffer.from("wrong:secret").toString("base64"):auth;
  return handler(new Request("https://example.invalid/webhook",{
   method,headers,body:method==="POST"?JSON.stringify(payload):undefined
  }));
 };
 return {request,calls:()=>dbCalls};
}
(async()=>{
 const noAuth=harness();
 assert.equal((await noAuth.request(event,{noAuth:true})).status,401);
 assert.equal((await noAuth.request(event,{badAuth:true})).status,401);
 assert.equal((await noAuth.request(event,{method:"GET"})).status,405);
 assert.equal(noAuth.calls().length,0);
 console.log("PASS Basic-authenticated and POST-only, no unauthorised DB access");

 const disabled=harness({disabled:true});
 assert.equal((await disabled.request()).status,503);
 assert.equal(disabled.calls().length,0);
 console.log("PASS event handler disabled by default");

 const valid=harness();
 assert.equal((await valid.request()).status,200);
 assert.equal(valid.calls().length,1);
 assert.equal(valid.calls()[0].p_event,"delivered");
 assert.equal(valid.calls()[0].p_recipient,"course-account@example.invalid");
 assert.equal(valid.calls()[0].p_provider_message_id,"postmark-fixture-id");
 console.log("PASS provider delivery status mapped only to accepted message ID/recipient RPC");

 const bounce=harness();
 const bounced={...event,RecordType:"Bounce",Email:event.Recipient,
  BouncedAt:"2026-11-23T20:11:00Z"};
 assert.equal((await bounce.request(bounced)).status,200);
 assert.equal(bounce.calls()[0].p_event,"bounced");
 console.log("PASS separate bounce event identifies correct recipient");

 const spoof=harness();
 assert.equal((await spoof.request({...event,Tag:"spam"})).status,200);
 assert.equal((await spoof.request({...event,MessageStream:"broadcast"})).status,200);
 assert.equal((await spoof.request({...event,RecordType:"Opened"})).status,200);
 assert.equal(spoof.calls().length,0);
 console.log("PASS unrelated stream, tags and event types ignored");

 const invalid=harness();
 assert.equal((await invalid.request({...event,Recipient:"not-an-email"})).status,422);
 assert.equal((await invalid.request({...event,DeliveredAt:"not-a-date"})).status,422);
 assert.equal(invalid.calls().length,0);
 console.log("PASS malformed provider events refused before DB");

 const unrecorded=harness({dbNoMatch:true});
 assert.equal((await unrecorded.request()).status,503);
 const broken=harness({dbError:true});
 assert.equal((await broken.request()).status,503);
 console.log("PASS unmatched or not-committed provider events require reconciliation/retry");
 console.log("ALL STAGED CONFIRMATION DELIVERY WEBHOOK TESTS PASSED");
})().catch(e=>{console.error(e);process.exitCode=1});

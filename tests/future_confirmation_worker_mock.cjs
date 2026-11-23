// Execute actual staged TypeScript worker + fixed snapshots with fake Supabase/Postmark.
// No network, customer messages, live payment API, or production database.
const fs=require("node:fs");
const vm=require("node:vm");
const ts=require("typescript");
const assert=require("node:assert/strict");
const {webcrypto}=require("node:crypto");

const root="supabase/functions/future-contract-confirmation-worker/";
const fixture={
 session_id:"cs_live_fixture_future_only",
 claim_token:"11111111-1111-4111-8111-111111111111",
 recipient_email:"course-account@example.invalid", // not the Stripe payer email
 course_id:"beginner-training-course",paid_amount_pence:999,currency:"gbp",
 terms_version:"2026-11-21-course-v1",
 consent_recorded_at:"2026-11-23T20:08:00Z",
 confirmed_at:"2026-11-23T20:10:00Z"
};
function moduleFixture(file,mocks={}){
 const source=fs.readFileSync(root+file,"utf8");
 const output=ts.transpileModule(source,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
 }}).outputText;
 const exports={};
 const env={
  exports,
  require:(p)=>{
   if(p==="npm:@supabase/supabase-js@2.49.4")return {createClient:mocks.createClient};
   if(p==="./mail-content.ts")return mocks.mail;
   if(p==="./contract-snapshot.ts")return mocks.snapshot;
   throw Error("Unexpected import "+p);
  },
  Deno:mocks.Deno,
  Request,Response,Headers,TextEncoder,TextDecoder,AbortSignal,
  Uint8Array,btoa,atob,crypto:webcrypto,Date,JSON,console,fetch:mocks.fetch
 };
 vm.runInNewContext(output,env,{timeout:5000,filename:file});
 return exports;
}
const snapshot=moduleFixture("contract-snapshot.ts");
const mail=moduleFixture("mail-content.ts",{snapshot});

const message=mail.buildDurableEmail({...fixture},"courses@flatoutbuiltuproofing.co.uk");
assert.equal(message.To,fixture.recipient_email);
assert.equal(message.From,"courses@flatoutbuiltuproofing.co.uk");
assert.equal(message.MessageStream,"outbound");
assert.match(message.HtmlBody,/£9\.99/);
assert.match(message.HtmlBody,/21 November 2026/);
assert.match(message.HtmlBody,/Terms of Use and Training Safety/);
assert.match(message.HtmlBody,/Digital Course Cancellation and Refunds/);
assert.match(message.HtmlBody,/consent and acknowledgement/i);
assert.match(message.TextBody,/Digital Course Cancellation and Refunds/);
assert.ok(message.HtmlBody.length>11000);
console.log("PASS complete frozen legal documents + consent embedded, not only linked");
for(const changed of [
 {paid_amount_pence:998},{terms_version:"sandbox-test"},{course_id:"different-course"},
 {currency:"usd"},{session_id:"cs_test_invalid"},
 {recipient_email:"evil@\r\nBcc:attacker.invalid"}
]){
 assert.throws(()=>mail.buildDurableEmail({...fixture,...changed},"courses@flatoutbuiltuproofing.co.uk"));
}
assert.throws(()=>mail.buildDurableEmail(fixture,"spoof@other.invalid"));
console.log("PASS strict course amount, terms, recipient and verified sender validation");

function harness(options={}){
 let handler,providerCalls=0,rpcCalls=[],claimed=false,jobStatus="pending";
 const env={
  FUTURE_CONFIRMATION_WORKER_KEY:"fake-secret-long-random",
  FUTURE_CONFIRMATION_DELIVERY_ENABLED:options.disabled?"false":"true",
  FUTURE_CONFIRMATION_PROVIDER:options.unapproved?"none":"postmark",
  FUTURE_CONFIRMATION_FROM:options.invalidFrom?"spoof@other.invalid":"courses@flatoutbuiltuproofing.co.uk",
  POSTMARK_SERVER_TOKEN:options.testToken?"POSTMARK_API_TEST":"fake-postmark-token-example",
  SUPABASE_URL:"https://example.invalid",
  SUPABASE_SERVICE_ROLE_KEY:"service_role_fixture_only"
 };
 const rpc=async(name,params)=>{
  rpcCalls.push({name,params});
  if(name==="claim_future_contract_confirmations"){
   if(options.claimError)return {data:null,error:{message:"db unavailable"}};
   if(jobStatus!=="pending"||claimed)return {data:[],error:null};
   claimed=true;jobStatus="leased";
   return {data:[{...fixture,...options.overrideJob}],error:null};
  }
  if(name==="finish_future_contract_confirmation"){
   if(options.finishError)return {data:false,error:{message:"DB write failed"}};
   if(params.p_claim_token!==fixture.claim_token||jobStatus!=="leased")return {data:false,error:null};
   jobStatus=params.p_outcome;
   return {data:true,error:null};
  }
  throw Error("Unexpected RPC "+name);
 };
 const createClient=(_url,_secret)=>({rpc});
 const fetch=async(url,options)=>{
   providerCalls++;
   assert.equal(url,"https://api.postmarkapp.com/email");
   assert.equal(options.method,"POST");
   assert.equal(options.headers["X-Postmark-Server-Token"],env.POSTMARK_SERVER_TOKEN);
   const payload=JSON.parse(options.body);
   assert.equal(payload.To,fixture.recipient_email);
   assert.match(payload.HtmlBody,/Digital Course Cancellation and Refunds/);
   if(options.timeout)throw Error("Simulated provider timeout after possible acceptance");
   if(options.rejected)return new Response(JSON.stringify({ErrorCode:422,Message:"rejected"}),{status:422});
   return new Response(JSON.stringify({ErrorCode:0,MessageID:"postmark-fixture-id"}),{status:200});
 };
 const fetchMock=(url,o)=>{
   if(options.timeout)throw Error("simulated uncertain response");
   if(options.rejected)return Promise.resolve(new Response(JSON.stringify({ErrorCode:422}),{status:422}));
   return fetch(url,o);
 };
 const Deno={env:{get:key=>env[key]},serve:fn=>handler=fn};
 moduleFixture("index.ts",{Deno,createClient,mail,fetch:fetchMock});
 const request=async(opts={})=>{
  const headers={};
  if(!opts.noAuth)headers["x-fobur-worker-key"]="fake-secret-long-random";
  return handler(new Request("https://example.invalid/future-worker",{method:opts.method||"POST",headers}));
 };
 return {request,stats:()=>({providerCalls,rpcCalls,claimed,jobStatus})};
}
(async()=>{
 const disabled=harness({disabled:true});
 assert.equal((await disabled.request()).status,503);
 assert.equal(disabled.stats().rpcCalls.length,0);
 console.log("PASS delivery flag OFF means zero queue claims and zero provider sends");

 const noAuth=harness();
 assert.equal((await noAuth.request({noAuth:true})).status,401);
 assert.equal(noAuth.stats().providerCalls,0);
 assert.equal((await noAuth.request({method:"GET"})).status,405);
 console.log("PASS unknown worker token and GET blocked before database access");

 const noProvider=harness({unapproved:true});
 assert.equal((await noProvider.request()).status,503);
 assert.equal(noProvider.stats().rpcCalls.length,0);
 const testToken=harness({testToken:true});
 assert.equal((await testToken.request()).status,503);
 const badSender=harness({invalidFrom:true});
 assert.equal((await badSender.request()).status,503);
 console.log("PASS no unapproved provider, test-only token or unverified sending domain");

 const accepted=harness();
 const success=await accepted.request();
 assert.equal(success.status,200);
 const body=await success.json();
 assert.equal(body.status,"provider_accepted");
 assert.equal(body.delivered,false);
 assert.equal(accepted.stats().providerCalls,1);
 assert.equal(accepted.stats().jobStatus,"accepted");
 assert.equal(accepted.stats().rpcCalls[1].params.p_provider_message_id,"postmark-fixture-id");
 assert.equal((await accepted.request()).status,200);
 assert.equal(accepted.stats().providerCalls,1);
 console.log("PASS new order sends only once; provider acceptance never claims delivered");

 const uncertain=harness({timeout:true});
 assert.equal((await uncertain.request()).status,502);
 assert.equal(uncertain.stats().jobStatus,"review");
 assert.equal((await uncertain.request()).status,200);
 assert.equal(uncertain.stats().rpcCalls.filter(r=>r.name==="claim_future_contract_confirmations").length,2);
 assert.equal(uncertain.stats().providerCalls,0);
 console.log("PASS ambiguous outcome safely stops for review, not automatic resend");

 const badJob=harness({overrideJob:{paid_amount_pence:998}});
 assert.equal((await badJob.request()).status,422);
 assert.equal(badJob.stats().providerCalls,0);
 assert.equal(badJob.stats().jobStatus,"review");
 console.log("PASS malformed purchase cannot send email");

 const brokenDB=harness({claimError:true});
 assert.equal((await brokenDB.request()).status,503);
 assert.equal(brokenDB.stats().providerCalls,0);
 const commitError=harness({finishError:true});
 assert.equal((await commitError.request()).status,503);
 assert.equal(commitError.stats().providerCalls,1);
 assert.equal((await commitError.request()).status,200);
 assert.equal(commitError.stats().providerCalls,1);
 console.log("PASS provider acceptance with DB acknowledgement failure does not trigger a second send");
 console.log("ALL FUTURE CONFIRMATION WORKER SOURCE TESTS PASSED");
})().catch(e=>{console.error(e);process.exitCode=1});

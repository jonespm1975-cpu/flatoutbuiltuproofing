// The current DEPLOYED sources (copied to GitHub) are executed in a Deno VM fixture.
// No real user token, Supabase calls, Stripe payment or emails. Run with Node 22.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const identity = "11111111-1111-4111-8111-111111111111";
const origin = "https://flatoutbuiltuproofing.co.uk";
const mockReceipt = {
 stripe_checkout_session_id:"cs_live_fixture123",
 course_id:"beginner-training-course",
 paid_amount_pence:999,currency:"gbp",
 consent_recorded_at:"2026-11-21T13:00:00Z",
 confirmed_at:"2026-11-21T13:01:00Z",
 terms_version:"2026-11-21-course-v1"
};
const cases=[];
function run(slug, opts={}){
 let handler, userLookups=0, dbQueries=0;
 const used=[];
 const user = opts.anon ? {id:identity,is_anonymous:true,email:"qa@example.invalid"} :
   {id:identity,is_anonymous:false,email:"qa@example.invalid"};
 const anonClient={
  auth:{getUser: async token=>{userLookups++;assert.equal(token,"fixture-token");
    return opts.invalidAuth?{data:{user:null},error:{message:"invalid auth"}}:{data:{user},error:null};}},
  from(table){
   assert.equal(table,"course_access","private endpoint must use user-owned access checks");
   return newProxy(table);
  }
 };
 function newProxy(table){
  const chain={
   select(str){used.push(["select",str]);return chain},
   eq(field,value){used.push(["eq",field,value]);return chain},
   like(field,value){used.push(["like",field,value]);return chain},
   order(field,value){used.push(["order",field,value]);return chain},
   limit(n){
    used.push(["limit",n]);dbQueries++;
    if(opts.dbError)return Promise.resolve({data:null,error:{message:"fixture outage"}});
    return Promise.resolve({data:table==="course_access"?(opts.paid?[{id:"fixture-entitlement"}]:[]):(opts.receipts??[mockReceipt]),error:null});
   }
  };return chain;
 }
 const adminClient={
  from(table){
   assert.equal(table,"purchase_confirmations");
   return newProxy(table);
  }
 };
 const createClient=(url,key,options)=>{
  assert.equal(url,"https://example.invalid");
  if(slug==="my-purchase-confirmations" && key==="service_fixture")return adminClient;
  assert.equal(key,"anon_fixture");
  return anonClient;
 };
 const original=fs.readFileSync("supabase/functions/"+slug+"/index.ts","utf8");
 const compiled=ts.transpileModule(original.replace(/from "npm:@supabase\/supabase-js@2\.49\.4"/,"from \"supabase-fixture\""),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
 }).outputText;
 const env={SUPABASE_URL:"https://example.invalid",SUPABASE_ANON_KEY:"anon_fixture",SUPABASE_SERVICE_ROLE_KEY:"service_fixture"};
 const sandbox={
  exports:{},require:x=>x==="supabase-fixture"?{createClient}:null,
  Deno:{serve:fn=>handler=fn,env:{get:k=>env[k]}},
  Request,Response,Headers,console,JSON,Date
 };
 vm.runInNewContext(compiled,sandbox,{timeout:3000});
 assert.equal(typeof handler,"function");
 const request=async({method="GET",bearer=true,requestOrigin=origin}={})=>{
  const headers={};
  if(bearer)headers["authorization"]="Bearer fixture-token";
  if(requestOrigin!==null)headers.origin=requestOrigin;
  return handler(new Request("https://example.invalid/"+slug,{method,headers}));
 };
 return {request,stats:()=>({userLookups,dbQueries,used})};
}
async function verify(name,slug,options,requestOptions,expected,inspect=()=>{}){
 const fixture=run(slug,options);
 const response=await fixture.request(requestOptions);
 assert.equal(response.status,expected,name);
 const raw=await response.text();
 let body=null;try{body=raw?JSON.parse(raw):null}catch{body={message:raw}};
 inspect(body,fixture.stats());
 console.log("PASS",name,"HTTP",expected);
 cases.push(name);
}
(async()=>{
 const lesson="paid-lesson-content",confirmation="my-purchase-confirmations";
 await verify("lesson rejects wrong method",lesson,{}, {method:"POST"},405);
 await verify("lesson rejects missing bearer",lesson,{}, {bearer:false},401,(_,stats)=>assert.equal(stats.dbQueries,0));
 await verify("lesson rejects invalid JWT",lesson,{invalidAuth:true},{},401);
 await verify("lesson rejects anonymous account",lesson,{anon:true},{},401);
 await verify("lesson denies unpaid account",lesson,{paid:false},{},403,(body,stats)=>{
  assert.match(body.error,/not unlocked/);assert.equal(stats.dbQueries,1);
 });
 await verify("lesson returns 503 on access DB error",lesson,{dbError:true},{},503);
 await verify("lesson returns gated paid content",lesson,{paid:true},{},200,(body,stats)=>{
  assert.match(body.title,/Roof Inspection/);assert.ok(body.sections.length>=5);
  assert.deepEqual(stats.used.filter(x=>x[0]==="eq").map(x=>[x[1],x[2]]),
    [["user_id",identity],["course_id","beginner-training-course"]]);
  assert.ok(stats.used.some(x=>x[0]==="like"&&x[1]==="stripe_checkout_session_id"&&x[2]==="cs_live_%"));
 });
 await verify("confirmations reject POST",confirmation,{}, {method:"POST"},405);
 await verify("confirmations reject off-site origin",confirmation,{}, {requestOrigin:"https://other.invalid"},403);
 await verify("confirmations reject missing JWT",confirmation,{}, {bearer:false},401);
 await verify("confirmations reject expired JWT",confirmation,{invalidAuth:true},{},401);
 await verify("confirmations reject anonymous user",confirmation,{anon:true},{},401);
 await verify("confirmations fail closed on DB outage",confirmation,{dbError:true},{},503);
 await verify("confirmations filtered to own account",confirmation,{}, {},200,(body,stats)=>{
  assert.equal(body.customer_email,"qa@example.invalid");
  assert.equal(body.records.length,1);
  assert.equal(body.records[0].stripe_checkout_session_id,"cs_live_fixture123");
  assert.ok(stats.used.some(x=>x[0]==="eq"&&x[1]==="user_id"&&x[2]===identity));
  assert.ok(stats.used.some(x=>x[0]==="limit"&&x[1]===20));
 });
 await verify("confirmations return zero records for unpaid",confirmation,{receipts:[]},{},200,body=>assert.equal(body.records.length,0));
 console.log("PRIVATE ENDPOINT SOURCE TESTS PASSED",cases.length,"cases; no real credentials or API calls");
})().catch(error=>{console.error(error);process.exitCode=1});

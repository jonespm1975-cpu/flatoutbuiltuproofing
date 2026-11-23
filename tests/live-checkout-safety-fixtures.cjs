// Actual deployed/committed live checkout handler, tested with fake Stripe + Supabase.
// No real Stripe API requests, no payment sessions, no customer-data access.
const fs=require("node:fs"),assert=require("node:assert/strict"),vm=require("node:vm"),ts=require("typescript");
const source=fs.readFileSync("supabase/functions/stripe-live-checkout/index.ts","utf8");
const js=ts.transpileModule(source
  .replace('from "npm:stripe@17.7.0"','from "stripe-fixture"')
  .replace('from "npm:@supabase/supabase-js@2.49.4"','from "supabase-fixture"'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const uid="11111111-1111-4111-8111-111111111111";
function fixture(opts={}){
 let handler,created=0,authChecks=0,lastParams;
 const env={
  STRIPE_LIVE_CHECKOUT_ENABLED:opts.disabled?"false":"true",
  STRIPE_SECRET_KEY:opts.incompleteKey?"not-live":"sk_live_disposable_fixture",
  SUPABASE_URL:"https://example.invalid",SUPABASE_ANON_KEY:"anon_fixture"
 };
 class Stripe{
  constructor(){}
  checkout={sessions:{create:async params=>{
   created++;lastParams=params;
   if(opts.stripeFailure)throw new Error("fixture provider unavailable");
   return {id:"cs_live_mock",url:"https://checkout.stripe.com/c/pay/mock"};
  }}};
 }
 function createClient(){
  return {auth:{getUser:async()=>{
   authChecks++;
   if(opts.invalidAuth)return {data:{user:null},error:{message:"expired"}};
   return {data:{user:{id:uid,is_anonymous:!!opts.anonymous,email:"buyer@example.invalid"}},error:null};
  }}};
 }
 vm.runInNewContext(js,{exports:{},require:m=>m==="stripe-fixture"?{default:Stripe}:m==="supabase-fixture"?{createClient}:null,
  Deno:{serve:fn=>handler=fn,env:{get:k=>env[k]}},Request,Response,Headers,JSON,Date,console},{timeout:1000});
 const call=async(o={})=>{
  const method=o.method||"POST",headers={origin:o.origin||"https://flatoutbuiltuproofing.co.uk"};
  if(!o.noBearer)headers.authorization="Bearer fake-auth";
  if(method==="POST")headers["content-type"]="application/json";
  const consent={immediate_access_consent:true,cancellation_acknowledgement:true,terms_accepted:true,...o.consent};
  return handler(new Request("https://example.invalid/functions/v1/stripe-live-checkout",
   {method,headers,body:method==="POST"?JSON.stringify(consent):undefined}));
 };
 return {call,stats:()=>({created,authChecks,lastParams})};
}
async function check(name,opts,req,status,maxCalls=0){
 const f=fixture(opts);const r=await f.call(req);
 assert.equal(r.status,status,name);
 assert.equal(f.stats().created,maxCalls,name+" Stripe session count");
 console.log("PASS",name,"HTTP",status);
 return f;
}
(async()=>{
 await check("non-POST refused",{}, {method:"GET"},405);
 await check("wrong origin blocked",{}, {origin:"https://attacker.invalid"},403);
 await check("disabled flag blocks checkout",{disabled:true},{},503);
 await check("incomplete live secret blocks checkout",{incompleteKey:true},{},503);
 await check("login mandatory",{}, {noBearer:true},401);
 await check("invalid login blocked",{invalidAuth:true},{},401);
 await check("anonymous login blocked",{anonymous:true},{},401);
 for(const key of ["immediate_access_consent","cancellation_acknowledgement","terms_accepted"]){
  await check("missing required "+key,{}, {consent:{[key]:false}},422);
 }
 await check("provider failure returns 503",{stripeFailure:true},{},503,1);
 const f=await check("valid consented UK one-time checkout fixture",{}, {},200,1);
 const x=f.stats().lastParams;
 assert.equal(x.mode,"payment");
 assert.equal(x.line_items.length,1);
 assert.equal(x.line_items[0].price,"price_1UaRJvKeIprRDTKxKDawW6ZG");
 assert.equal(x.line_items[0].quantity,1);
 assert.equal(x.client_reference_id,uid);
 assert.deepEqual(Array.from(x.shipping_address_collection.allowed_countries),["GB"]);
 assert.equal(x.metadata.immediate_access_consent,"true");
 assert.equal(x.metadata.cancellation_acknowledgement,"true");
 assert.equal(x.metadata.terms_accepted,"true");
 assert.equal(x.metadata.supabase_user_id,uid);
 assert.equal(x.metadata.eligibility_policy,"uk-address-v1");
 assert.match(x.success_url,/members\.html\?checkout=success/);
 assert.equal(x.automatic_tax.enabled,false);
 console.log("PASS exact £9.99 price, UK-only shipping, paid session, account mapping and express consent");
 const second=fixture();
 await second.call();await second.call();
 const duplicates=second.stats().created;
 assert.equal(duplicates,2,"Current code has no duplicate-session checkout reservation");
 console.warn("OPEN RISK: two parallel same-buyer submissions can create distinct Checkout Sessions; prevent double payment before release.");
 console.log("ALL EXISTING LIVE CHECKOUT SAFETY ASSERTIONS PASS; DUPLICATE-SESSION RISK IS OPEN");
})().catch(e=>{console.error(e);process.exitCode=1});

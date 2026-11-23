// Execute staged checkout source using mock Supabase + mock Stripe.
// No live environment tokens, network calls, charges or sessions are created.
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const ts=require("typescript");
const buyer="11111111-1111-4111-8111-111111111111";
const course="beginner-training-course";
const source=fs.readFileSync("supabase/functions/stripe-live-checkout/index.ts","utf8");
const js=ts.transpileModule(source
 .replace('from "npm:stripe@17.7.0"','from "stripe-fixture"')
 .replace('from "npm:@supabase/supabase-js@2.49.4"','from "supabase-fixture"'),
 {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;

function model(opts={}){
 let handler,createCount=0,retrieveCount=0;
 let row=opts.existingOpen?{status:"open",key:"open-key",url:"https://checkout.stripe.com/c/pay/older",sid:"cs_live_prior",expires_at:Date.now()-2000}:null;
 let accessOwned=Boolean(opts.owned);
 const env={STRIPE_LIVE_CHECKOUT_ENABLED:opts.disabled?"false":"true",
 STRIPE_SECRET_KEY:"sk_live_fixture_only",SUPABASE_URL:"https://example.invalid",
 SUPABASE_ANON_KEY:"anon-fixture",SUPABASE_SERVICE_ROLE_KEY:"service-fixture"};
 const recorded=[];
 function rpc(name,params){
  recorded.push({name,params});
  if(name==="reserve_live_course_checkout"){
   if(accessOwned)return {data:{result:"owned"},error:null};
   if(!row){row={status:"creating",key:"stable-attempt",timestamp:"2026-11-23T18:00:00Z"};
    return {data:{result:"create_once",reservation_key:row.key,consent_recorded_at:row.timestamp},error:null};}
   if(row.status==="creating")return {data:{result:"pending"},error:null};
   if(row.status==="open"){
    if(row.expires_at>Date.now()+30000)return {data:{result:"open",url:row.url,stripe_session_id:row.sid},error:null};
    return {data:{result:"reconcile",reservation_key:row.key,stripe_session_id:row.sid},error:null};
   }
  }
  if(name==="finalize_live_course_checkout"){
   if(!row||row.key!==params.p_reservation_key)return {data:{result:"conflict"},error:null};
   if(row.status==="creating"){
    row={status:"open",key:row.key,url:params.p_stripe_url,sid:params.p_stripe_session_id,expires_at:Date.parse(params.p_expires_at)};
   }
   return {data:{result:"open"},error:null};
  }
  if(name==="recycle_expired_live_course_checkout"){
   if(row?.sid!==params.p_stripe_session_id)return {data:{result:"conflict"},error:null};
   row={status:"creating",key:"recycled-attempt",timestamp:"2026-11-23T20:08:00Z"};
   return {data:{result:"create_once",reservation_key:row.key,consent_recorded_at:row.timestamp},error:null};
  }
  throw Error("Unexpected DB RPC "+name);
 }
 class StripeFixture{
   checkout={sessions:{
     create:async (params,options)=>{
       createCount++;assert.equal(params.client_reference_id,buyer);
       assert.equal(params.mode,"payment");
       assert.equal(params.line_items.length,1);
       assert.equal(params.line_items[0].price,"price_1UaRJvKeIprRDTKxKDawW6ZG");
       assert.deepEqual(Array.from(params.shipping_address_collection.allowed_countries),["GB"]);
       assert.equal(params.metadata.supabase_user_id,buyer);
       assert.equal(options.idempotencyKey,"fobur-live-lesson-"+(row?.key));
       if(opts.stripeCreateFailure)throw Error("simulated Stripe timeout, outcome unknown");
       return {id:"cs_live_fixture_"+createCount,url:"https://checkout.stripe.com/c/pay/fixture",
        status:"open",payment_status:"unpaid",expires_at:Math.floor(Date.now()/1000)+3600};
     },
     retrieve:async id=>{
       retrieveCount++;assert.equal(id,"cs_live_prior");
       return {id,status:opts.stripeOldPaid?"complete":"expired",
        payment_status:opts.stripeOldPaid?"paid":"unpaid",mode:"payment",client_reference_id:buyer};
     }
   }};
 }
 function createClient(_url,key){
   if(key==="anon-fixture")return {auth:{getUser:async()=>{
    if(opts.invalidAuth)return {data:{user:null},error:{message:"bad"}};
    return {data:{user:{id:buyer,is_anonymous:!!opts.anonymous}},error:null};
   }}};
   if(key==="service-fixture")return {rpc:async(name,params)=>rpc(name,params)};
   throw Error("Unexpected credential");
 }
 const sandbox={exports:{},require:n=>n==="stripe-fixture"?{default:StripeFixture}:n==="supabase-fixture"?{createClient}:null,
   Deno:{serve:fn=>handler=fn,env:{get:key=>env[key]}},Date,Request,Response,Headers,JSON,console};
 vm.runInNewContext(js,sandbox,{timeout:3000});
 async function request(args={}){
  const headers={origin:args.origin||"https://flatoutbuiltuproofing.co.uk",
    "content-type":"application/json"};
  if(!args.noAuth)headers.Authorization="Bearer fake-token";
  const method=args.method||"POST";
  return handler(new Request("https://example.invalid/stripe-live-checkout",{
   method,headers,body:method==="POST"?JSON.stringify({
    immediate_access_consent:true,cancellation_acknowledgement:true,terms_accepted:true,...args.consent}):undefined}));
 }
 return {request,stats:()=>({createCount,retrieveCount,recorded,row})};
}
async function expect(name,opts,args,status,expectedCreates=0){
 const x=model(opts),resp=await x.request(args);
 assert.equal(resp.status,status,name);
 assert.equal(x.stats().createCount,expectedCreates,name+" create count");
 console.log("PASS",name,"HTTP",status);
 return x;
}
(async()=>{
 await expect("disabled checkout cannot create session",{disabled:true},{},503);
 await expect("wrong origin blocked",{}, {origin:"https://attacker.invalid"},403);
 await expect("missing auth blocked",{}, {noAuth:true},401);
 await expect("invalid auth blocked",{invalidAuth:true},{},401);
 await expect("anonymous auth blocked",{anonymous:true},{},401);
 await expect("missing consent blocked",{}, {consent:{terms_accepted:false}},422);
 await expect("already-purchased buyer denied",{owned:true},{},409);
 const one=model();
 let first=await one.request();
 assert.equal(first.status,200);
 const url=(await first.json()).url;
 assert.equal(url,"https://checkout.stripe.com/c/pay/fixture");
 let again=await one.request();
 assert.equal(again.status,200);
 assert.equal((await again.json()).url,url);
 assert.equal(one.stats().createCount,1);
 assert.equal(one.stats().recorded.filter(x=>x.name==="finalize_live_course_checkout").length,1);
 console.log("PASS same buyer repeats return the exact same session without re-creating checkout");
 const race=model();
 const both=await Promise.all([race.request(),race.request()]);
 assert.deepEqual(both.map(x=>x.status).sort(),[200,409]);
 assert.equal(race.stats().createCount,1);
 console.log("PASS concurrent same-buyer requests create only one Checkout Session");
 const uncertain=model({stripeCreateFailure:true});
 assert.equal((await uncertain.request()).status,503);
 assert.equal((await uncertain.request()).status,409);
 assert.equal(uncertain.stats().createCount,1);
 console.log("PASS Stripe ambiguous create timeout blocks new attempts pending stable retry");
 const expired=model({existingOpen:true});
 assert.equal((await expired.request()).status,200);
 assert.equal(expired.stats().retrieveCount,1);
 assert.equal(expired.stats().createCount,1);
 console.log("PASS Stripe-confirmed expired/unpaid session can be replaced");
 const paidOld=model({existingOpen:true,stripeOldPaid:true});
 assert.equal((await paidOld.request()).status,409);
 assert.equal(paidOld.stats().createCount,0);
 console.log("PASS old paid Checkout Session cannot produce duplicate charge");
 console.log("ALL STAGED PHASE 1 CHECKOUT SOURCE TESTS PASSED");
})().catch(e=>{console.error(e);process.exitCode=1});

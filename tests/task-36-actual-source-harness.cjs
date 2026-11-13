// Task 36: isolated executable harness for archived deployed TypeScript sources.
// npm install --no-save typescript@5.7.3 && node tests/task-36-actual-source-harness.cjs
// No network requests are made by the harness itself.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('typescript');
const root=process.cwd();
const checkout=fs.readFileSync(root+'/supabase/functions/stripe-test-checkout/task-31-v24-index.ts','utf8');
const webhook=fs.readFileSync(root+'/supabase/functions/stripe-test-webhook/task-33-v25-index.ts','utf8');
async function run(source,overrides={}){
 let handler,created=0,retrieved=0,emails=0,grants=0,claims=0;
 const state={claim:{result:'owned'},session:{id:'cs_test_mock',url:'https://example.invalid/mock',livemode:false,mode:'payment',client_reference_id:'user-1',metadata:{supabase_user_id:'user-1',course_id:'beginner-training-course'},status:'open',payment_status:'unpaid'},...overrides};
 class Stripe{
 constructor(){}
 static createSubtleCryptoProvider(){return {}}
 webhooks={constructEventAsync:async()=>{if(state.badSignature)throw Error('bad signature');return state.event}};
 checkout={sessions:{
 create:async()=>{created++;if(state.createError)throw Error('mock Stripe failure');return state.session},
 retrieve:async()=>{retrieved++;if(state.retrieveError)throw Error('mock Stripe retrieval failure');return state.session},
 listLineItems:async()=>({has_more:false,data:[{price:{id:'price_1UaRCSKS41qhUQTKl2uSNnYN'},quantity:1}]})
 }}
 }
 const admin={
 auth:{admin:{getUserById:async()=>({data:{user:{email:'test@example.invalid'}},error:null})}},
 rpc:async(name)=>{if(name==='reserve_test_course_checkout'){claims++;return {data:state.claim,error:null}};return {data:true,error:null}},
 from:(table)=>({
 upsert:()=>{if(table==='course_access')grants++;return Promise.resolve({error:null})},
 select:()=>({eq:()=>({single:async()=>({data:{confirmation_email_status:'sent'},error:null})})}),
 update:()=>({eq:async()=>({error:null})})
 })
 };
 const auth={auth:{getUser:async()=>({data:{user:{id:'user-1',is_anonymous:false}},error:null})}};
 const createClient=(_url,key)=>key==='service'?admin:auth;
 const env={COURSE_TEST_CHECKOUT_V2_ENABLED:'true',STRIPE_TEST_CHECKOUT_ENABLED:'true',STRIPE_TEST_SECRET_KEY:'sk_test_mock',SUPABASE_URL:'mock',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service',STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock',STRIPE_TEST_UNLOCK_ENABLED:'true'};
 const js=ts.transpileModule(source.replace(/from "npm:stripe@17.7.0"/,'from "stripe-mock"').replace(/from "npm:@supabase\/supabase-js@2.49.4"/,'from "supabase-mock"'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const sandbox={exports:{},require:(name)=>name==='stripe-mock'?{default:Stripe}:name==='supabase-mock'?{createClient}:null,
 Deno:{serve:fn=>handler=fn,env:{get:key=>env[key]}},Response,Request,Headers,console,fetch:async()=>{emails++;return {ok:true}},Date,JSON};
 vm.runInNewContext(js,sandbox,{timeout:3000});
 const request=(body={},headers={})=>handler(new Request('https://example.invalid',{method:'POST',headers:{origin:'https://flatoutbuiltuproofing.co.uk',Authorization:'Bearer mock','content-type':'application/json',...headers},body:JSON.stringify(body)}));
 return {request,stats:()=>({created,retrieved,emails,grants,claims})};
}
(async()=>{
 const consent={immediate_access_consent:true,cancellation_acknowledgement:true,terms_accepted:true};
 let h=await run(checkout);assert.equal((await h.request(consent)).status,409);assert.equal(h.stats().created,0);
 h=await run(checkout,{claim:{result:'pending'}});assert.equal((await h.request(consent)).status,409);assert.equal(h.stats().created,0);
 h=await run(checkout,{claim:{result:'create_once'},createError:true});assert.equal((await h.request(consent)).status,503);assert.equal(h.stats().created,1);
 h=await run(checkout,{claim:{result:'session_created',stripe_session_id:'cs_test_mock'}});assert.equal((await h.request(consent)).status,200);assert.equal(h.stats().created,0);assert.equal(h.stats().retrieved,1);
 h=await run(checkout,{claim:{result:'session_created',stripe_session_id:'cs_test_mock'},session:{id:'cs_test_mock',livemode:false,mode:'payment',client_reference_id:'other',metadata:{supabase_user_id:'other',course_id:'beginner-training-course'},status:'open',payment_status:'unpaid',url:'https://example.invalid'}});assert.equal((await h.request(consent)).status,409);
 h=await run(webhook,{badSignature:true});assert.equal((await h.request({},{'stripe-signature':'invalid'})).status,400);
 console.log('PASS 6 isolated actual-source mocked handler tests; no Stripe/Supabase/Resend network access');
})().catch(e=>{console.error(e);process.exitCode=1});

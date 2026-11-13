// Task 70: execute actual TypeScript webhook source with injected Stripe, Supabase and Resend mocks.
// Node 22 + typescript compiler. No network, secrets, real customers, or production DB.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync('supabase/functions/stripe-test-webhook/task67-candidate.ts','utf8')
 .replace(/^import Stripe from "npm:stripe@17\.7\.0";/m,'')
 .replace(/^import \{ createClient \} from "npm:@supabase\/supabase-js@2\.49\.4";/m,'');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const uid='e3e7ec12-c5fa-4486-ad4f-8af5fcfa919e';
const session={id:'cs_test_task70_fixture',mode:'payment',payment_status:'paid',currency:'gbp',amount_subtotal:999,amount_total:999,client_reference_id:uid,metadata:{supabase_user_id:uid,course_id:'beginner-training-course',immediate_access_consent:'true',cancellation_acknowledgement:'true',terms_accepted:'true',consent_recorded_at:'2026-11-13T00:00:00Z'}};
async function run({eventType='checkout.session.completed',livemode=false,mode='payment',emailFlag='true',provider='ok',two=false,unlock='true'}={}){
 let handler,claimed=false,attempts=0,sends=0,finishes=[],access=0,claims=0;
 let lockResolve,lockBarrier=new Promise(r=>lockResolve=r);
 const stripeEvent={id:'evt_task70_fixture',type:eventType,livemode,data:{object:{...session,mode}}};
 class Stripe {constructor() {this.checkout={sessions:{listLineItems:async()=>({has_more:false,data:[{price:{id:'price_1UaRCSKS41qhUQTKl2uSNnYN'},quantity:1}]})}};this.webhooks={constructEventAsync:async()=>stripeEvent};} static createSubtleCryptoProvider(){return {}}}
 const admin={auth:{admin:{getUserById:async()=>({data:{user:{email:'fixture@example.invalid'}},error:null})}},from:(table)=>({upsert:async()=>{if(table==='course_access')access++;return {error:null}}}),rpc:async(name,args)=>{
  if(name==='mark_test_course_checkout_fulfilled')return {data:false,error:null};
  if(name==='claim_test_course_confirmation_email'){claims++;if(!claimed){claimed=true;attempts++;return {data:[{claim_token:'00000000-0000-4000-8000-000000000001',attempt_number:attempts}],error:null}}return {data:[],error:null}}
  if(name==='finish_test_course_confirmation_email'){finishes.push(args);return {data:true,error:null}}
  throw Error(name);
 }};
 const env={STRIPE_TEST_WEBHOOK_SECRET:'test-secret',STRIPE_TEST_UNLOCK_ENABLED:unlock,STRIPE_TEST_SECRET_KEY:'test-key',SUPABASE_URL:'http://localhost',SUPABASE_SERVICE_ROLE_KEY:'test-role',SANDBOX_COURSE_EMAIL_SEND_ENABLED:emailFlag,RESEND_API_KEY:'mock',PURCHASE_CONFIRMATION_FROM:'test@example.invalid'};
 const context={Stripe,createClient:()=>admin,Deno:{serve:f=>handler=f,env:{get:k=>env[k]}},Response,URL,console,fetch:async(_url,options)=>{sends++;if(provider==='timeout')throw Error('timeout');if(provider==='http503')return {ok:false,status:503,json:async()=>({name:'temporary'})};if(provider==='ambiguous')return {ok:true,json:async()=>({})};return {ok:true,json:async()=>({id:'provider_fixture_id'})}}};
 vm.runInNewContext(js,context,{filename:'task67-candidate.ts'});
 const req=()=>({method:'POST',headers:{get:()=> 'signature'},text:async()=> 'signed-test-payload'});
 const responses=await Promise.all(Array.from({length:two?2:1},()=>handler(req())));
 return {statuses:responses.map(x=>x.status),texts:await Promise.all(responses.map(x=>x.text())),sends,finishes,access,claims};
}
(async()=>{
 let a=await run({two:true});assert.equal(a.sends,1);assert.equal(a.finishes.length,1);assert.equal(a.finishes[0].p_accepted,true);console.log('PASS: two duplicate signed webhook invocations -> one provider send and one finish');
 a=await run({emailFlag:'false',two:true});assert.equal(a.sends,0);assert.equal(a.claims,0);console.log('PASS: email flag fail-closed');
 a=await run({mode:'subscription'});assert.equal(a.sends,0);assert.equal(a.access,0);console.log('PASS: membership event isolated from course webhook');
 a=await run({livemode:true});assert.equal(a.sends,0);assert.equal(a.access,0);console.log('PASS: live event rejected');
 a=await run({provider:'http503'});assert.equal(a.sends,1);assert.equal(a.finishes[0].p_accepted,false);console.log('PASS: provider HTTP failure marks retry');
 a=await run({provider:'timeout'});assert.equal(a.sends,1);assert.equal(a.finishes.length,0);console.log('PASS: ambiguous timeout retains lease');
 a=await run({provider:'ambiguous'});assert.equal(a.sends,1);assert.equal(a.finishes.length,0);console.log('PASS: ambiguous response retains lease');
 a=await run({unlock:'false'});assert.equal(a.sends,0);assert.equal(a.access,0);assert.deepEqual(a.statuses,[503]);console.log('PASS: disabled fulfilment fails closed');
})().catch(e=>{console.error(e);process.exitCode=1});

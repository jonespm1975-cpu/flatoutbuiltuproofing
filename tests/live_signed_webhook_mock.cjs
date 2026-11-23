// Isolated signed webhook source tests; no real Stripe, Supabase, customers or email.
// Uses the *current production TypeScript source*, transpiled into mocked Deno.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createHmac, timingSafeEqual } = require('node:crypto');
const ts = require('typescript');

const source = fs.readFileSync('supabase/functions/stripe-webhook/index.ts','utf8');
const javascript = ts.transpileModule(
  source.replace('from "npm:stripe@17.7.0"','from "stripe-fixture"')
        .replace('from "npm:@supabase/supabase-js@2.49.4"','from "supabase-fixture"'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}
).outputText;
const user = '11111111-1111-4111-8111-111111111111';
const secret = 'whsec_disposable_fixture_only';
function freshEvent(){
  return {id:'evt_disposable',type:'checkout.session.completed',livemode:true,data:{object:{
    id:'cs_live_disposable',payment_status:'paid',mode:'payment',currency:'gbp',amount_total:999,
    client_reference_id:user,payment_link:null,
    shipping_details:{address:{country:'GB'}},
    metadata:{course_id:'beginner-training-course',supabase_user_id:user,
      immediate_access_consent:'true',cancellation_acknowledgement:'true',
      terms_accepted:'true',consent_recorded_at:'2026-11-21T12:00:00Z',
      eligibility_policy:'uk-address-v1'}
  }}};
}
function clone(x){return JSON.parse(JSON.stringify(x))}
function signedHeader(payload,bad=false){
  const time = 1795267051;
  const hmac=createHmac('sha256',secret).update(time+'.'+payload).digest('hex');
  return 't='+time+',v1='+(bad?'0'.repeat(64):hmac);
}
function harness(options={}){
  let handler;
  let upsertCalls=0,recordWrites=0,listCalls=0,authCalls=0;
  const records=new Map();
  const environment={
    STRIPE_WEBHOOK_SECRET:secret, COURSE_UNLOCK_ENABLED:options.unlockDisabled?'false':'true',
    STRIPE_SECRET_KEY:'sk_live_disposable_fixture',SUPABASE_URL:'https://example.invalid',
    SUPABASE_SERVICE_ROLE_KEY:'service_role_disposable_fixture',
    STRIPE_LESSON_COURSE_ID:'beginner-training-course'
  };
  class StripeFixture{
    constructor(){
      this.webhooks={constructEventAsync:async (payload,header,signingSecret)=>{
        if(signingSecret!==secret||!header)throw Error('Invalid Stripe signature');
        const time=/\bt=(\d+)/.exec(header)?.[1];
        const sig=/\bv1=([a-f0-9]+)/.exec(header)?.[1];
        if(!time||!sig||sig.length!==64)throw Error('Invalid Stripe signature');
        const expected=createHmac('sha256',signingSecret).update(time+'.'+payload).digest();
        const actual=Buffer.from(sig,'hex');
        if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('Invalid Stripe signature');
        return JSON.parse(payload);
      }};
      this.checkout={sessions:{listLineItems:async ()=>{
        listCalls++;
        if(options.lineItemsError)throw Error('Line items unavailable');
        return {has_more:false,data:[{price:{id:options.wrongLinePrice?'price_wrong':'price_1UaRJvKeIprRDTKxKDawW6ZG'},quantity:1}]};
      }}};
    }
    static createSubtleCryptoProvider(){return {}}
  }
  const admin={
    auth:{admin:{getUserById:async id=>{
      authCalls++;
      return options.userError?{data:{user:null},error:{message:'missing'}}:{data:{user:{id}},error:null};
    }}},
    from: table=>({
      upsert:async (row,configuration)=>{
        assert.equal(table,'purchase_confirmations');
        assert.equal(configuration.onConflict,'stripe_checkout_session_id');
        assert.equal(configuration.ignoreDuplicates,true);
        upsertCalls++;
        if(options.dbError)return {error:{code:'TEST_FAILURE'}};
        if(!records.has(row.stripe_checkout_session_id)){records.set(row.stripe_checkout_session_id,row);recordWrites++;}
        return {error:null};
      }
    })
  };
  const createClient=()=>admin;
  const sandbox={
    exports:{},require:module=>module==='stripe-fixture'?{default:StripeFixture}:
      module==='supabase-fixture'?{createClient}:null,
    Deno:{serve:fn=>{handler=fn},env:{get:k=>environment[k]}},
    Request,Response,Headers,Date,console,JSON,Buffer
  };
  vm.runInNewContext(javascript,sandbox,{timeout:2000});
  assert.equal(typeof handler,'function');
  async function request(evt=freshEvent(),optionsForRequest={}){
    const payload=JSON.stringify(evt);
    const headers={};
    if(!optionsForRequest.missingSignature)
      headers['stripe-signature']=signedHeader(payload,!!optionsForRequest.badSignature);
    return handler(new Request('https://fixture.invalid/webhook',
      {method:'POST',headers,body:payload}));
  }
  return {request,stats:()=>({upsertCalls,recordWrites,listCalls,authCalls,records})};
}
async function scenario(name,modify,expected,shouldWrite=false,options={}){
  const h=harness(options);
  const event=freshEvent();
  if(modify)modify(event);
  const response=await h.request(event);
  assert.equal(response.status,expected,name);
  assert.equal(h.stats().recordWrites,shouldWrite?1:0,name);
  console.log('PASS',name,response.status);
}
(async()=>{
  const good=harness();
  assert.equal((await good.request()).status,200);
  assert.equal((await good.request()).status,200);
  assert.equal(good.stats().upsertCalls,2);
  assert.equal(good.stats().recordWrites,1);
  assert.equal(good.stats().records.size,1);
  console.log('PASS duplicate signed event only records one purchase');

  const invalid=harness();
  assert.equal((await invalid.request(freshEvent(),{badSignature:true})).status,400);
  assert.equal(invalid.stats().recordWrites,0);
  assert.equal((await invalid.request(freshEvent(),{missingSignature:true})).status,400);
  console.log('PASS HMAC-invalid and signature-missing events blocked');
  await scenario('unpaid checkout ignored',e=>e.data.object.payment_status='unpaid',200);
  await scenario('asynchronous paid checkout accepted',e=>e.type='checkout.session.async_payment_succeeded',200,true);
  await scenario('asynchronous failed checkout ignored',e=>e.type='checkout.session.async_payment_failed',200);
  await scenario('testmode event blocked',e=>e.livemode=false,422);
  await scenario('wrong payment amount blocked',e=>e.data.object.amount_total=998,422);
  await scenario('non-UK address blocked',e=>e.data.object.shipping_details.address.country='US',422);
  await scenario('missing immediate consent blocked',e=>e.data.object.metadata.immediate_access_consent='false',422);
  await scenario('buyer identity mismatch blocked',e=>e.data.object.metadata.supabase_user_id='someone_else',422);
  await scenario('wrong course blocked',e=>e.data.object.metadata.course_id='other-course',422);
  await scenario('payment link blocked',e=>e.data.object.payment_link='plink_untrusted',422);
  await scenario('wrong line item price blocked',null,422,false,{wrongLinePrice:true});
  await scenario('unknown customer blocked',null,422,false,{userError:true});
  await scenario('database failure retries',null,503,false,{dbError:true});
  await scenario('Stripe line-item outage retries',null,503,false,{lineItemsError:true});
  await scenario('operator unlock flag false retries',null,503,false,{unlockDisabled:true});
  console.log('ALL OFFLINE SIGNED-WEBHOOK SOURCE TESTS PASSED; zero external calls');
})().catch(err=>{console.error(err);process.exitCode=1});

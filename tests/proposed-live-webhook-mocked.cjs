// Mocked HTTP/webhook contract tests of a NOT-DEPLOYED proposal only.
// No Stripe/Resend/Supabase network requests or secret keys.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const raw = fs.readFileSync('proposals/stripe-webhook-decoupled-NOT-DEPLOYED.ts', 'utf8');
const source = raw
  .replace('from "npm:stripe@17.7.0"', 'from "stripe-mock"')
  .replace('from "npm:@supabase/supabase-js@2.49.4"', 'from "supabase-mock"');
const js = ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
}).outputText;

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const lesson = 'beginner-training-course';
const livePrice = 'price_1UaRJvKeIprRDTKxKDawW6ZG';
const checkoutSession = () => ({
  id:'cs_live_synthetic_review_only', mode:'payment', currency:'gbp',
  amount_total:999,payment_status:'paid',livemode:true,
  client_reference_id:id,
  collected_information:{shipping_details:{address:{country:'GB'}}},
  metadata:{
    course_id:lesson,supabase_user_id:id,
    terms_accepted:'true',immediate_access_consent:'true',
    cancellation_acknowledgement:'true',
    eligibility_policy:'uk-address-v1',
    consent_recorded_at:'2026-11-21T17:00:00.000Z'
  },
  payment_link:null
});
const event = () => ({id:'evt_synthetic',type:'checkout.session.completed',livemode:true,data:{object:checkoutSession()}});
async function handlerWith(opts={}) {
  let handler;
  const state = {
    event: opts.event || event(),
    rpcValue:opts.rpcValue || 'recorded',
    badSignature:opts.badSignature||false,
    rpcError:opts.rpcError||false,
    disabled:opts.disabled||false,
    badPrice:opts.badPrice||false,
  };
  const counts = {rpc:0,createClient:0,emails:0};
  const invocation={};
  class Stripe {
    constructor(){}
    static createSubtleCryptoProvider(){return {}}
    webhooks={constructEventAsync:async()=>{
      if(state.badSignature)throw Error('invalid synthetic signature');
      return state.event;
    }}
    checkout={sessions:{listLineItems:async()=>({
      has_more:false,
      data:[{price:{id:state.badPrice?'price_invalid':livePrice},quantity:1}]
    })}}
  }
  const admin={
    auth:{admin:{getUserById:async()=>({data:{user:{id,email:'test@example.invalid'}},error:null})}},
    rpc:async(name,args)=>{
      counts.rpc++;
      invocation.name=name;invocation.args=args;
      return state.rpcError?{data:null,error:{code:'mock_error'}}:{data:state.rpcValue,error:null};
    }
  };
  const environment={
    STRIPE_WEBHOOK_SECRET:'whsec_synthetic',
    COURSE_UNLOCK_ENABLED:state.disabled?'false':'true',
    STRIPE_SECRET_KEY:'sk_live_fake_not_real',
    SUPABASE_URL:'https://example.invalid',
    SUPABASE_SERVICE_ROLE_KEY:'service_synthetic',
    STRIPE_LESSON_PRICE_ID:livePrice,
    STRIPE_LESSON_COURSE_ID:lesson,
  };
  const sandbox={
    exports:{},require:(name)=>{
      if(name==='stripe-mock')return {default:Stripe};
      if(name==='supabase-mock')return {createClient:()=>{counts.createClient++;return admin}};
      throw Error('unexpected module: '+name);
    },
    Deno:{serve:f=>handler=f,env:{get:key=>environment[key]}},
    Response,Request,Headers,JSON,console,
    fetch:async()=>{counts.emails++;throw Error('network forbidden')},
  };
  vm.runInNewContext(js,sandbox,{timeout:2500});
  assert.equal(typeof handler,'function');
  const request=new Request('https://synthetic.invalid/webhook',{
    method:'POST',headers:{'stripe-signature':'synthetic'},body:'{}'
  });
  const response=await handler(request);
  return {response,counts,invocation};
}
async function check(name,opts,status,expectedRPC) {
  const result=await handlerWith(opts);
  assert.equal(result.response.status,status,name);
  assert.equal(result.counts.rpc,expectedRPC,name+' RPC count');
  assert.equal(result.counts.emails,0,'webhook must never send email');
  console.log('PASS: '+name);
  return result;
}
(async()=>{
  const success=await check('valid signed paid GB course event',{},200,1);
  assert.equal(success.invocation.name,'record_verified_live_course_purchase');
  assert.equal(success.invocation.args.p_user_id,id);
  assert.equal(success.invocation.args.p_amount_pence,999);
  assert.equal(success.invocation.args.p_country,'GB');
  assert.equal(success.invocation.args.p_price_id,livePrice);
  await check('invalid signature',{badSignature:true},400,0);
  await check('disabled course unlock',{disabled:true},503,0);
  const unpaid=event();unpaid.data.object.payment_status='unpaid';
  await check('unpaid session',{event:unpaid},200,0);
  const foreign=event();foreign.data.object.collected_information.shipping_details.address.country='US';
  await check('non-GB order',{event:foreign},422,0);
  const subscription=event();subscription.data.object.mode='subscription';
  await check('subscription cannot unlock one-off course',{event:subscription},422,0);
  const amount=event();amount.data.object.amount_total=199;
  await check('wrong price amount',{event:amount},422,0);
  const owner=event();owner.data.object.metadata.supabase_user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await check('wrong purchaser mapping',{event:owner},422,0);
  const consent=event();consent.data.object.metadata.immediate_access_consent='false';
  await check('absent express consent',{event:consent},422,0);
  await check('wrong line-item price',{badPrice:true},422,0);
  await check('database RPC error',{rpcError:true},503,1);
  await check('database duplicate-event acknowledgement',{rpcValue:'already_recorded'},200,1);
  console.log('12 mocked webhook acceptance/rejection checks passed; no real network activity');
})().catch(e=>{console.error(e);process.exitCode=1});

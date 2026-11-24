import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

// Load the Edge Function entrypoints unchanged. Replace only external SDKs and I/O.
const sdk = new Map([
  ['npm:stripe@17.7.0', 'export default class Stripe { static createSubtleCryptoProvider(){}; webhooks={constructEventAsync:async()=>globalThis.fixture}; checkout={sessions:{listLineItems:async()=>{throw Error("unexpected Stripe call")}}}; }'],
  ['npm:@supabase/supabase-js@2.49.4', 'export function createClient(){return globalThis.mockDb}'],
]);
registerHooks({resolve(name,ctx,next){return sdk.has(name)?{shortCircuit:true,url:'data:text/javascript,'+encodeURIComponent(sdk.get(name))}:next(name,ctx)}});
const env=new Map(Object.entries({
  FUTURE_CONFIRMATION_WORKER_KEY:'owner-fixture', FUTURE_CONFIRMATION_DELIVERY_ENABLED:'true', FUTURE_CONFIRMATION_PROVIDER:'postmark',
  FUTURE_CONFIRMATION_FROM:'info@flatoutbuiltuproofing.co.uk',POSTMARK_SERVER_TOKEN:'fake-offline-token',
  SUPABASE_URL:'https://unused.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture',STRIPE_TEST_WEBHOOK_SECRET:'fixture',
  STRIPE_TEST_SECRET_KEY:'sk_test_fixture',STRIPE_TEST_UNLOCK_ENABLED:'true'
}));
let handler;
globalThis.Deno={env:{get:k=>env.get(k)},serve:fn=>{handler=fn}};
await import('../functions/stripe-test-webhook/index.ts');
const sandbox=handler;
await import('../functions/future-contract-confirmation-worker/index.ts');
const worker=handler;
const user='10000000-0000-4000-8000-000000000001';
const req=headers=>new Request('https://local.invalid',{method:'POST',headers,body:'{}'});
test('invalid consent date stops sandbox fulfilment before any account lookup or write',async()=>{
  globalThis.fixture={type:'checkout.session.completed',livemode:false,data:{object:{payment_status:'paid',client_reference_id:user,mode:'payment',currency:'gbp',amount_subtotal:999,amount_total:999,metadata:{supabase_user_id:user,course_id:'beginner-training-course',immediate_access_consent:'true',cancellation_acknowledgement:'true',terms_accepted:'true',consent_recorded_at:'invalid'}}}};
  const res=await sandbox(req({'stripe-signature':'fixture'}));
  assert.equal(res.status,422);assert.match(await res.text(),/timestamp invalid/);
});
for(const scenario of ['accepted','rejection','wrong recipient','timeout','accepted but database finish fails']){
  test(scenario,async()=>{
    const to='owner@example.invalid';
    const job={session_id:'cs_live_fixture',recipient_email:to,claim_token:'fixture',course_id:'beginner-training-course',paid_amount_pence:999,currency:'gbp',terms_version:'2026-11-21-course-v1',consent_recorded_at:'2026-11-24T12:00:00Z',confirmed_at:'2026-11-24T12:00:00Z'};
    let sent=0,claimed=false;const outcomes=[];
    globalThis.mockDb={async rpc(name,params){
      if(name==='claim_future_contract_confirmations'){const items=claimed?[]:[job];claimed=true;return {data:items}}
      assert.equal(name,'finish_future_contract_confirmation');outcomes.push(params.p_outcome);return {data:scenario!=='accepted but database finish fails'};
    }};
    const previous=globalThis.fetch;
    globalThis.fetch=async(url,options)=>{
      assert.equal(url,'https://api.postmarkapp.com/email');const email=JSON.parse(options.body);
      assert.equal(email.To,to);assert.equal(email.MessageStream,'outbound');sent++;
      if(scenario==='timeout')throw new Error('ambiguous provider timeout');
      return Response.json({To:scenario==='wrong recipient'?'another@example.invalid':to,MessageID:'message-fixture',ErrorCode:scenario==='rejection'?300:0},{status:scenario==='rejection'?422:200});
    };
    try{
      const headers={'x-fobur-worker-key':'owner-fixture'};
      const res=await worker(req(headers));
      const accepted=scenario.startsWith('accepted');
      assert.equal(res.status,scenario==='accepted'?200:accepted?503:502);assert.deepEqual(outcomes,[accepted?'accepted':'review']);
      const repeat=await worker(req(headers));assert.equal((await repeat.json()).status,'idle');assert.equal(sent,1);
    }finally{globalThis.fetch=previous;}
  });
}

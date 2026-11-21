import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import StripeSDK from 'stripe';
const readSource = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const launchSql = [
  "membership-lifecycle.sql",
  "membership-checkout.sql",
  "membership-confirmations.sql",
  "membership-confirmation-schedule.sql",
];
const stripImports = source => source.replace(/^import .*;$/gm, "");
const webhookSource = stripImports(readSource("functions/membership-live-webhook/index.ts"));
const workerSource = [
  readSource("functions/membership-live-confirmation-worker/terms-v1.ts").replaceAll("export const", "const"),
  stripImports(readSource("functions/membership-live-confirmation-worker/index.ts")),
].join("\n");

const db=new PGlite();
try {
await db.exec(`
create role anon;create role authenticated;create role service_role;
create schema internal;create schema auth;create schema cron;create schema net;create schema vault;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean);
create function auth.uid() returns uuid language sql stable as 'select current_setting(''fixture.uid'',true)::uuid';
create table public.membership_subscriptions(
  stripe_subscription_id text primary key,stripe_customer_id text not null,stripe_price_id text not null,
  user_id uuid not null references auth.users(id),status text not null,current_period_end timestamptz not null,
  cancel_at_period_end boolean not null,last_stripe_event_created bigint not null,updated_at timestamptz not null,livemode boolean not null
);
create table cron.job(jobid bigint generated always as identity primary key,jobname text,schedule text,command text,active boolean default true,username text default current_user);
create table vault.decrypted_secrets(name text,decrypted_secret text);
create table net.requests(id bigint generated always as identity,url text,body jsonb,headers jsonb);
create function cron.schedule(job_name text,schedule text,command text) returns bigint language sql as 'insert into cron.job(jobname,schedule,command) values ($1,$2,$3) returning jobid';
create function cron.alter_job(job_id bigint,schedule text default null,command text default null,database text default null,username text default null,active boolean default null) returns void language sql as 'update cron.job set active=$6 where jobid=$1';
create function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds integer default 5000) returns bigint language sql as 'insert into net.requests(url,body,headers) values ($1,$2,$4) returning id';
insert into cron.job(jobname,schedule,command) values ('fobur-live-purchase-email-worker','*/5 * * * *','existing course confirmation');
`);
for(const migration of launchSql.map(name => readSource('launch/'+name)))await db.exec(migration);
const user='123e4567-e89b-42d3-a456-426614174000';
const version='2026-11-21-learning-pass-v1';
const queuedAt=Math.floor(Date.now()/1000);
const periodStart=queuedAt-25;
const periodEnd=queuedAt+3600*24*31;
const sandboxEmail='buyer@example.invalid';
const projectUrl='https://abcdefghijklmnopqrst.supabase.co';
const env={SUPABASE_URL:projectUrl,SUPABASE_SERVICE_ROLE_KEY:'test-only',MEMBERSHIP_LIVE_FULFILMENT_ENABLED:'true',MEMBERSHIP_LIVE_WEBHOOK_SECRET:'whsec_local_fixture',MEMBERSHIP_LIVE_WEBHOOK_STRIPE_KEY:'rk_live_fixture',MEMBERSHIP_LIVE_PRICE_ID:'price_fixture',MEMBERSHIP_LIVE_CONFIRMATION_WORKER_TOKEN:'local_fixture_token_01234567890123456789',MEMBERSHIP_LIVE_CONFIRMATION_ENABLED:'true',RESEND_API_KEY:'local-fixture',PURCHASE_CONFIRMATION_FROM:'sender@example.invalid'};
const rows=async(sql,params=[]) => (await db.query(sql,params)).rows;
const one=async(sql,params=[]) => (await rows(sql,params))[0]?.value;
await db.query('insert into auth.users values ($1,$2,now(),false)',[user,sandboxEmail]);
await db.query("select set_config('fixture.uid',$1,false)",[user]);
await db.query('insert into vault.decrypted_secrets values ($1,$2),($3,$4)',['membership_live_confirmation_project_url',projectUrl,'membership_live_confirmation_worker_token',env.MEMBERSHIP_LIVE_CONFIRMATION_WORKER_TOKEN]);
const argsByRpc={begin_live_membership_sync:[],sync_live_membership_order:['p_payload','p_intent','p_session','p_terms'],claim_live_membership_confirmations:['p_limit'],finish_live_membership_confirmation:['p_job','p_token','p_outcome','p_provider_message_id']};
const adapter={rpc:async(name,args={})=>{
  assert.ok(Object.hasOwn(argsByRpc,name),name);
  assert.deepEqual(Object.keys(args).sort(),[...argsByRpc[name]].sort(),'RPC field names must match SQL: '+name);
  const values=argsByRpc[name].map(k=>k==='p_payload'?JSON.stringify(args[k]):args[k]);
  const parameters=values.map((_,i)=>'$'+(i+1)).join(',');
  const result=name==='claim_live_membership_confirmations'
       ?await rows('select * from public.'+name+'('+parameters+')',values)
       :await one('select public.'+name+'('+parameters+') as value',values);
  return {data:result,error:null};
}};
const intent=await one('select public.reserve_live_membership_checkout($1,$2,$3) as value',[user,'price_fixture',version]);
assert.equal(await one('select public.record_live_membership_checkout($1,$2,$3) as value',[user,intent.id,'cs_live_fixture']),true);
const active=()=>one('select public.has_active_membership() as value');
const invoke=()=>one('select internal.dispatch_live_membership_confirmation_worker() as value');
const stored=()=>rows('select status,attempts,provider_message_id from internal.live_membership_confirmation_outbox');
const stripeSdk=new StripeSDK('local-verifier');
const item={id:'si_fixture',quantity:1,current_period_start:periodStart,current_period_end:periodEnd,price:{id:'price_fixture',currency:'gbp',unit_amount:199,recurring:{interval:'month',interval_count:1}}};
let stripeStatus='active';
let refundedAmount=0;
let disputeStatuses=[];
const invoicePayment = {
  livemode: true, status: "paid", currency: "gbp", amount_paid: 199,
  payment: { type: "payment_intent", payment_intent: "pi_current" },
};
class Stripe {
 static createSubtleCryptoProvider(){return StripeSDK.createSubtleCryptoProvider()}
 constructor(key){if(key==='webhook-verifier')return stripeSdk;assert.equal(key,'rk_live_fixture')}
 subscriptions={retrieve:async()=>({id:'sub_fixture',livemode:true,status:stripeStatus,cancel_at_period_end:false,cancel_at:null,customer:'cus_fixture',latest_invoice:'in_fixture',items:{data:[item],has_more:false},metadata:{supabase_user_id:user,membership:'monthly-learning',mode:'live',membership_terms_version:version}})};
 checkout={sessions:{list:async()=>({has_more:false,data:[{id:'cs_live_fixture',livemode:true,status:'complete',payment_status:'paid',mode:'subscription',client_reference_id:user,customer:'cus_fixture',currency:'gbp',amount_total:199,metadata:{membership_terms_version:version,eligibility_policy:'uk-address-v1',membership_checkout_intent:intent.id,terms_accepted:'true',recurring_billing_consent:'true',immediate_access_consent:'true',cancellation_acknowledgement:'true'},collected_information:{shipping_details:{address:{country:'GB'}}}}]})}};
 invoices={retrieve:async id=>({
  status:"paid", livemode:true, currency:"gbp", customer:"cus_fixture",
  parent:id==="in_oneoff"?null:{subscription_details:{subscription:"sub_fixture"}},
  total:199, amount_paid:199, amount_remaining:0,
  lines:{has_more:false,data:[{parent:{subscription_item_details:{subscription_item:item.id,proration:false}},period:{start:periodStart,end:periodEnd}}]},
 })};
 invoicePayments={list:async ({invoice,payment})=>{
  if(invoice) {
   assert.equal(invoice,"in_fixture");
   return {has_more:false,data:[{...invoicePayment,invoice}]};
  }
  assert.equal(payment.type,"payment_intent");
  const invoiceId={pi_current:"in_fixture",pi_old:"in_old",pi_oneoff:"in_oneoff"}[payment.payment_intent];
  return {has_more:false,data:invoiceId?[{...invoicePayment,invoice:invoiceId}]:[]};
 }};
 paymentIntents={retrieve:async (id,options)=>{
  assert.equal(id,"pi_current");
  assert.deepEqual([...options.expand],["latest_charge"]);
  return {
   id,livemode:true,status:"succeeded",currency:"gbp",amount_received:199,
   latest_charge:{
    id:"ch_fixture",payment_intent:id,livemode:true,status:"succeeded",paid:true,captured:true,
    currency:"gbp",amount_captured:199,amount_refunded:refundedAmount,refunded:refundedAmount===199,
   },
  };
 }};
 charges={retrieve:async id=>{
  assert.equal(id,"ch_fixture");
  return {livemode:true,payment_intent:"pi_current"};
 }};
 disputes={list:async ({charge})=>{
  assert.equal(charge,"ch_fixture");
  return {has_more:false,data:disputeStatuses.map(status=>({livemode:true,status}))};
 }};
}
function handler(source,settings){
 let entry;
 vm.runInNewContext(stripTypeScriptTypes(source),{createClient:()=>adapter,Response,TextEncoder,btoa,crypto,AbortSignal,console,Deno:{env:{get:k=>env[k]},serve:fn=>{entry=fn}},...settings});
 return entry;
}
const stripeHandler=handler(webhookSource,{Stripe});
const sendEvent=async (kind,object,id)=>{
 const payload=JSON.stringify({type:kind,id,livemode:true,created:queuedAt,data:{object}});
 const signature=stripeSdk.webhooks.generateTestHeaderString({payload,secret:env.MEMBERSHIP_LIVE_WEBHOOK_SECRET});
 const response=await stripeHandler(new Request(projectUrl,{method:'POST',headers:{'stripe-signature':signature},body:payload}));
 assert.equal(response.status,200,await response.text());
};
const providerRequests=[];
const emailHandler=handler(workerSource,{fetch:async(url,request)=>{
 assert.equal(url,'https://api.resend.com/emails');
 providerRequests.push({headers:request.headers,body:JSON.parse(request.body)});
 return new Response(JSON.stringify(providerRequests.length===1?{code:'fixture-timeout'}:{id:'mail-accepted-fixture'}),{status:providerRequests.length===1?503:200});
}});
async function runScheduled(id){
 const request=(await rows('select url,body,headers from net.requests where id=$1',[id]))[0];
 assert.equal(request.url,projectUrl+'/functions/v1/membership-live-confirmation-worker');
 const response=await emailHandler(new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(request.body)}));
 assert.equal(response.status,200);
 return response.json();
}
assert.equal(await active(),false);
assert.equal(await invoke(),null);
await sendEvent('checkout.session.completed',{subscription:'sub_fixture'},'evt_first');
await sendEvent('invoice.paid',{parent:{subscription_details:{subscription:'sub_fixture'}}},'evt_initial_invoice');
assert.deepEqual(await stored(),[{status:'pending',attempts:0,provider_message_id:null}]);
assert.equal(await active(),false);
const first=await invoke();
assert.ok(first>0);
assert.equal((await runScheduled(first)).retries,1);
assert.equal(await active(),false);
assert.equal(await invoke(),null);
await db.exec("update internal.live_membership_confirmation_outbox set next_attempt_at=now()-interval '1 second'");
const second=await invoke();assert.ok(second>first);
assert.equal((await runScheduled(second)).accepted,1);
assert.deepEqual(await stored(),[{status:'sent',attempts:2,provider_message_id:'mail-accepted-fixture'}]);
assert.equal(await active(),true);
assert.equal(providerRequests.length,2);
assert.deepEqual(providerRequests[0],providerRequests[1]);
assert.equal(providerRequests[0].body.to[0],sandboxEmail);
assert.match(providerRequests[0].body.text,/£1\.99 per month until cancelled/);
const attachment=Buffer.from(providerRequests[0].body.attachments[0].content,'base64').toString('utf8');
assert.ok(attachment.includes(version));
await sendEvent('checkout.session.completed',{subscription:'sub_fixture'},'evt_first');
assert.equal(await invoke(),null);
await sendEvent("charge.refunded", { payment_intent: "pi_old" }, "evt_old_period_refund");
assert.equal(await active(),true);
await sendEvent("charge.refunded", { payment_intent: "pi_oneoff" }, "evt_separate_course_refund");
assert.equal(await active(),true);

disputeStatuses=["needs_response"];
await sendEvent("charge.dispute.created", { payment_intent: "pi_current" }, "evt_dispute_open");
assert.equal(await active(),false);
disputeStatuses=["won"];
await sendEvent("charge.dispute.closed", { payment_intent: "pi_current" }, "evt_dispute_won");
assert.equal(await active(),true);
disputeStatuses=["lost"];
await sendEvent("charge.dispute.closed", { payment_intent: "pi_current" }, "evt_dispute_lost");
assert.equal(await active(),false);

disputeStatuses=[];
refundedAmount=1;
await sendEvent("refund.updated", { payment_intent: "pi_current" }, "evt_partial_refund");
assert.equal(await active(),false);
refundedAmount=0;
await sendEvent("refund.failed", { charge: "ch_fixture" }, "evt_failed_refund");
assert.equal(await active(),true);
refundedAmount=199;
await sendEvent("charge.refunded", { payment_intent: "pi_current" }, "evt_full_refund");
assert.equal(await active(),false);
assert.equal(await invoke(),null);
assert.equal(providerRequests.length,2);

stripeStatus='canceled';
await sendEvent('customer.subscription.deleted',{id:'sub_fixture'},'evt_cancel');
assert.equal(await active(),false);
assert.equal(await invoke(),null);
assert.equal(await one("select active as value from cron.job where jobname='fobur-live-membership-confirmation-worker'"),false);
assert.equal(await one("select active as value from cron.job where jobname='fobur-live-purchase-email-worker'"),true);
console.log('Integrated checkout-to-confirmation test passed: signed fixture, one queue row, scheduled retry, stable email, access unlock, duplicate ignored, refunds, disputes and cancellation relock.');
} finally { await db.close(); }

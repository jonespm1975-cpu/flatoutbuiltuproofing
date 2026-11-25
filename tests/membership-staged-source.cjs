// Offline execution of archived deployed membership code. Never deploy or use live credentials.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createHmac,webcrypto}=require('node:crypto');
const ts=require('typescript');
const base='audits/membership-staged-source-2026-11-25/';
const user='11111111-1111-4111-8111-111111111111',key='22222222-2222-4222-8222-222222222222';
const price='price_1UeNy2KeIprRDTKxLWoER0vk',secret='fixture-secret',future=2000000000;
const origin='https://flatoutbuiltuproofing.co.uk';
function event(type='invoice.paid'){return {type,livemode:true,created:1795600000,data:{object:type.startsWith('customer.')?{id:'sub_fixture'}:{id:'in_fixture',parent:{subscription_details:{subscription:'sub_fixture'}}}}}}
function setup(name,opts={}){
 const source=fs.readFileSync(base+name+'.ts','utf8');
 assert.match(source,/const RELEASE_APPROVED\s*=\s*false/);
 // Only an in-memory fixture copy opens the interlock, never the checked-in source.
 const code=ts.transpileModule(opts.unlocked?source.replace(/const RELEASE_APPROVED\s*=\s*false/,'const RELEASE_APPROVED=true'):source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 let handler, calls=[], writes=[];
 const env={MEMBERSHIP_LIVE_WEBHOOK_SECRET:secret,MEMBERSHIP_LIVE_FULFILMENT_ENABLED:'true',MEMBERSHIP_LIVE_PORTAL_ENABLED:'true',MEMBERSHIP_LIVE_CHECKOUT_ENABLED:'true',MEMBERSHIP_CONFIRMATION_DELIVERY_ENABLED:'true',STRIPE_SECRET_KEY:'sk_live_fixture_only',SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',SUPABASE_ANON_KEY:'fixture-anon',POSTMARK_SERVER_TOKEN:'fixture-token-only',FUTURE_CONFIRMATION_FROM:'training@flatoutbuiltuproofing.co.uk',MEMBERSHIP_CONFIRMATION_WORKER_KEY_SHA256:require('node:crypto').createHash('sha256').update('fixture-worker').digest('hex')};
 const subscription={id:'sub_fixture',livemode:true,status:'active',customer:'cus_fixture',latest_invoice:'in_fixture',cancel_at_period_end:false,metadata:{supabase_user_id:user,membership:'monthly-learning',mode:'live',reservation_key:key,terms_version:'membership-2026-11-24-v1'},items:{data:[{quantity:1,current_period_end:future,price:{id:price,unit_amount:500,currency:'gbp',recurring:{interval:'month',interval_count:1}}}]}};
 const invoice={id:'in_fixture',livemode:true,status:'paid',currency:'gbp',amount_remaining:0,amount_paid:500,total:500,amount_paid_off_stripe:0,billing_reason:'subscription_create',customer:'cus_fixture',parent:{subscription_details:{subscription:'sub_fixture'}},payments:{has_more:false,data:[{status:'paid',amount_paid:500,currency:'gbp',payment:{type:'payment_intent',payment_intent:'pi_fixture'}}]}};
 const intent={livemode:true,status:'succeeded',currency:'gbp',amount_received:500,customer:'cus_fixture'};
 const config={livemode:true,active:true,features:{subscription_cancel:{enabled:true,mode:'at_period_end'},subscription_update:{enabled:false}}};
 const job={subscription_id:'sub_fixture',invoice_id:'in_fixture',paid_pence:500,currency:'gbp',recipient:'customer@fixture.invalid',terms_text:'Fixture terms. '.repeat(15),terms_version:'membership-2026-11-24-v1',consented_at:'2026-11-24T12:00:00Z',next_payment_at:'2026-12-24T12:00:00Z',claim_token:key};
 opts.modify?.({subscription,invoice,intent,config,job,env});
 const call=(name)=>calls.push(name);
 const chain={select(){return this},eq(){return this},in(){return this},order(){return this},async limit(){return {data:opts.existing===false?[]:[{stripe_customer_id:'cus_fixture',stripe_subscription_id:'sub_fixture'}],error:null}}};
 class Stripe{
  constructor(){this.webhooks={constructEventAsync:async(body,sig,s)=>{if(s!==secret||sig!==createHmac('sha256',s).update(body).digest('hex'))throw Error('signature');return JSON.parse(body)}};
   this.subscriptions={retrieve:async()=>{call('subscription');return subscription}};
   this.invoices={retrieve:async()=>{call('invoice');return invoice}};
   this.paymentIntents={retrieve:async()=>{call('intent');return intent}};
   this.billingPortal={configurations:{retrieve:async()=>{call('config');return config}},sessions:{create:async()=>{call('portal');return {url:'https://fixture.invalid/portal'}}}};
   this.checkout={sessions:{create:async()=>{call('checkout');return {id:'cs_fixture'}},retrieve:async()=>({url:'https://fixture.invalid/checkout',status:'open',payment_status:'unpaid',mode:'subscription',livemode:true,client_reference_id:user,metadata:{reservation_key:key}})}};
  } static createSubtleCryptoProvider(){return {}}
 }
 const admin={auth:{getUser:async()=>({data:{user:opts.noUser?null:{id:user}},error:null}),admin:{getUserById:async()=>({data:{user:{id:user,email:'customer@fixture.invalid',email_confirmed_at:'2026-11-24'}},error:null})}},from:()=>chain,rpc:async(n,p)=>{call(n);writes.push({n,p});
  if(n==='apply_membership_event_and_confirmation')return {data:!opts.dbError,error:opts.dbError?{code:'fixture'}:null};
  if(n==='claim_membership_confirmation')return {data:opts.empty?[]:[job],error:null};
  if(n==='finish_membership_confirmation')return {data:!opts.finishError,error:null};
  if(n==='reserve_live_membership_checkout')return {data:key,error:null};
  if(n==='inspect_live_membership_checkout')return {data:{reservation_key:key,created_epoch:Math.floor(Date.now()/1000)},error:null};
  if(n==='record_membership_contract_consent')return {data:!opts.noConsent,error:null};
  throw Error('Unexpected RPC '+n)
 }};
 const sandbox={exports:{},require:n=>{if(n.startsWith('npm:stripe'))return {default:Stripe};if(n.startsWith('npm:@supabase'))return {createClient:()=>admin};throw Error('Unexpected module '+n)},Deno:{serve:f=>handler=f,env:{get:k=>env[k]}},Request,Response,Headers,Date,JSON,console,crypto:webcrypto,TextEncoder,Uint8Array,AbortSignal,fetch:async(url,request)=>{assert.equal(url,'https://api.postmarkapp.com/email');call('postmark-mock');if(opts.timeout)throw Error('fixture timeout');const body=JSON.parse(request.body);assert.equal(body.To,job.recipient);return new Response(JSON.stringify({ErrorCode:0,MessageID:'fixture-message',To:opts.mismatch?'wrong@fixture.invalid':job.recipient}),{status:200})}};
 vm.runInNewContext(code,sandbox,{timeout:2000});assert.equal(typeof handler,'function');
 return {calls,writes,request:async(e=event(),extra={})=>{const body=JSON.stringify(e),headers={'origin':origin,'authorization':'Bearer fixture','stripe-signature':createHmac('sha256',secret).update(body).digest('hex'),'x-fobur-worker-key':'fixture-worker',...extra};return handler(new Request('https://fixture.invalid',{method:'POST',headers,body}))}};
}
async function check(name,source,opts,status,validate,e,headers){const h=setup(source,opts);const r=await h.request(e,headers);assert.equal(r.status,status,name+': '+await r.text());validate?.(h);console.log('PASS',name);}
const unlocked={unlocked:true};
const write=h=>h.writes.find(x=>x.n==='apply_membership_event_and_confirmation')?.p;
(async()=>{
 for(const src of ['membership-live-checkout','membership-live-webhook','membership-live-portal','membership-confirmation-worker'])await check(src+' interlock',src,{},503,h=>assert.equal(h.calls.length,0));
 await check('bad webhook signature','membership-live-webhook',unlocked,400,h=>assert.equal(h.calls.length,0),event(),{'stripe-signature':'invalid'});
 await check('sandbox event refused','membership-live-webhook',unlocked,400,h=>assert.equal(h.calls.length,0),{...event(),livemode:false});
 await check('paid first invoice','membership-live-webhook',unlocked,200,h=>{assert.equal(write(h).p_payload.status,'active');assert.equal(write(h).p_first_invoice_id,'in_fixture');assert.equal(h.calls.filter(x=>x==='intent').length,1)});
 await check('failed renewal blocks access','membership-live-webhook',{...unlocked,modify:({invoice})=>invoice.status='open'},200,h=>{assert.equal(write(h).p_payload.status,'past_due');assert.equal(write(h).p_first_invoice_id,null)},event('invoice.payment_failed'));
 await check('cancellation scheduled','membership-live-webhook',{...unlocked,modify:({subscription,invoice})=>{subscription.cancel_at_period_end=true;invoice.billing_reason='subscription_cycle'}},200,h=>{assert.equal(write(h).p_payload.cancel_at_period_end,true);assert.equal(write(h).p_first_invoice_id,null)},event('customer.subscription.updated'));
 await check('cancelled subscription','membership-live-webhook',{...unlocked,modify:({subscription})=>subscription.status='canceled'},200,h=>{assert.equal(write(h).p_payload.status,'canceled');assert.equal(write(h).p_first_invoice_id,null)},event('customer.subscription.deleted'));
 await check('wrong price rejected','membership-live-webhook',{...unlocked,modify:({subscription})=>subscription.items.data[0].price.unit_amount=199},422,h=>assert.equal(h.writes.length,0));
 await check('unverified first payment rejected','membership-live-webhook',{...unlocked,modify:({intent})=>intent.status='requires_payment_method'},503,h=>assert.equal(h.writes.length,0));
 await check('database failure retries','membership-live-webhook',{...unlocked,dbError:true},503,h=>assert.equal(h.writes.length,1));
 await check('renewal does not enqueue first receipt','membership-live-webhook',{...unlocked,modify:({invoice})=>invoice.billing_reason='subscription_cycle'},200,h=>assert.equal(write(h).p_first_invoice_id,null));
 await check('portal checks active config','membership-live-portal',unlocked,200,h=>assert.ok(h.calls.includes('portal')));
 await check('portal refuses immediate cancellation config','membership-live-portal',{...unlocked,modify:({config})=>config.features.subscription_cancel.mode='immediately'},503,h=>assert.ok(!h.calls.includes('portal')));
 await check('portal refuses wrong owner','membership-live-portal',{...unlocked,modify:({subscription})=>subscription.metadata.supabase_user_id='wrong'},403,h=>assert.ok(!h.calls.includes('portal')));
 await check('checkout requires consent','membership-live-checkout',{...unlocked,existing:false},422,h=>assert.ok(!h.calls.includes('checkout')));
 await check('duplicate existing membership blocked','membership-live-checkout',unlocked,409,h=>assert.ok(!h.calls.includes('checkout')));
 await check('checkout recorded consent then mocked session','membership-live-checkout',{...unlocked,existing:false},200,h=>assert.ok(h.calls.indexOf('record_membership_contract_consent')<h.calls.indexOf('checkout')),{terms_accepted:true,recurring_billing_consent:true,cancellation_acknowledgement:true,immediate_supply_requested:true,terms_version:'membership-2026-11-24-v1'});
 await check('worker missing authorization','membership-confirmation-worker',unlocked,401,h=>assert.equal(h.calls.length,0),event(),{'x-fobur-worker-key':'wrong'});
 await check('empty queue no send','membership-confirmation-worker',{...unlocked,empty:true},200,h=>assert.ok(!h.calls.includes('postmark-mock')));
 await check('worker records provider acceptance','membership-confirmation-worker',unlocked,200,h=>assert.equal(h.writes.find(x=>x.n==='finish_membership_confirmation').p.p_outcome,'accepted'));
 await check('worker timeout quarantines job','membership-confirmation-worker',{...unlocked,timeout:true},502,h=>assert.equal(h.writes.find(x=>x.n==='finish_membership_confirmation').p.p_outcome,'review'));
 await check('worker wrong recipient response quarantined','membership-confirmation-worker',{...unlocked,mismatch:true},502,h=>assert.equal(h.writes.find(x=>x.n==='finish_membership_confirmation').p.p_outcome,'review'));
 await check('accepted provider but failed database finalization','membership-confirmation-worker',{...unlocked,finishError:true},503,h=>assert.equal(h.calls.filter(x=>x==='postmark-mock').length,1));
 console.log('ALL ISOLATED MEMBERSHIP SOURCE FIXTURES PASSED; no external calls or release changes');
})().catch(e=>{console.error(e);process.exitCode=1});

// Offline executable test harness. Run: node review/checkout-test.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/stripe-live-checkout.ts','utf8').replace(/^import .*;\s*$/gm,'').replace('error:string,status:number','error,status');
async function scenario(opts={}){
 let handler, reservation=opts.existing?{reservation_key:'mock-key',stripe_session_id:'cs_live_mock'}:null, creates=0, keys=[];
 const session={id:'cs_live_mock',livemode:true,client_reference_id:'mock-user',metadata:{course_id:'beginner-training-course',reservation_key:'mock-key'},status:'open',payment_status:'unpaid',url:'https://example.invalid/checkout',...opts.session};
 const env={STRIPE_LIVE_CHECKOUT_ENABLED:opts.disabled?'false':'true',STRIPE_SECRET_KEY:'sk_live_mock',SUPABASE_URL:'mock',SUPABASE_ANON_KEY:'mock-anon',SUPABASE_SERVICE_ROLE_KEY:'mock-service'};
 class Stripe{constructor(){this.checkout={sessions:{create:async(p,o)=>{creates++;keys.push(o.idempotencyKey);if(opts.timeout)throw Error('mock timeout');await Promise.resolve();return {...session,id:'cs_live_new',status:'open',payment_status:'unpaid',metadata:p.metadata};},retrieve:async()=>({...session,id:reservation.stripe_session_id,metadata:{...session.metadata,reservation_key:reservation.reservation_key}})},};this.paymentIntents={retrieve:async()=>({livemode:true,status:'canceled',amount_received:0,...opts.pi})}}}
 const createClient=()=>({auth:{getUser:async()=>({data:{user:{id:'mock-user',is_anonymous:!!opts.anonymous}}})},rpc:async(name,p)=>{
 if(name==='reserve_live_course_checkout'){if(opts.dbFail)return {error:true};if(opts.owned)return {data:{result:'owned_or_paid'}};if(reservation)return {data:{result:'existing',...reservation}};reservation={reservation_key:'mock-key',stripe_session_id:null};return {data:{result:'create_once',...reservation}};}
 if(name==='rotate_expired_live_course_checkout'){if(opts.rotateFail||reservation.reservation_key!==p.p_key||reservation.stripe_session_id!==p.p_session)return {data:{result:'conflict'}};reservation={reservation_key:'rotated-key',stripe_session_id:null};return {data:{result:'create_once',...reservation}};}
 if(opts.attachFail)return {data:false};reservation.stripe_session_id=p.p_session;return {data:true};}});
 vm.runInNewContext(source,{Stripe,createClient,Deno:{serve:f=>handler=f,env:{get:k=>env[k]}},Response,console:{error(){}}});
 const invoke=()=>handler(new Request('https://example.invalid',{method:'POST',headers:{origin:opts.badOrigin?'https://example.invalid':'https://flatoutbuiltuproofing.co.uk',authorization:'Bearer mock','content-type':'application/json'},body:JSON.stringify({immediate_access_consent:!opts.noConsent,cancellation_acknowledgement:true,terms_accepted:true})}));
 const results=await Promise.all(Array.from({length:opts.parallel||1},invoke));
 const retry=opts.retry?await invoke():null;
 return {statuses:results.map(r=>r.status),retry:retry?.status,creates,keys};
}
(async()=>{
 let r=await scenario({parallel:20,retry:true});assert.equal(r.creates,1);assert.equal(r.statuses.filter(s=>s===200).length,1);assert.equal(r.retry,200);assert.deepEqual(r.keys,['fobur-live-course-mock-key']);
 for(const [opts,status,retry,creates] of [[{owned:true},409,undefined,0],[{noConsent:true},422,undefined,0],[{anonymous:true},401,undefined,0],[{disabled:true},503,undefined,0],[{badOrigin:true},403,undefined,0],[{dbFail:true},503,undefined,0],[{timeout:true,retry:true},503,409,1],[{attachFail:true,retry:true},503,409,1],[{existing:true,session:{status:'expired'}},200,undefined,1],[{session:{client_reference_id:'wrong'},retry:true},200,409,1]]){r=await scenario(opts);assert.equal(r.statuses[0],status);assert.equal(r.retry,retry);assert.equal(r.creates,creates);}
 for(const [session,pi,rotateFail,status,creates] of [
 [{status:'expired',payment_intent:'pi_mock'},{status:'canceled'},false,200,1],
 [{status:'expired',payment_intent:'pi_mock'},{status:'processing'},false,409,0],
 [{status:'expired',payment_intent:'pi_mock'},{status:'succeeded'},false,409,0],
 [{status:'expired',payment_intent:'pi_mock'},{amount_received:999},false,409,0],
 [{status:'expired',payment_status:'paid'},null,false,409,0],
 [{status:'expired',after_expiration:{recovery:{enabled:true}}},null,false,409,0],
 [{status:'expired',recovered_from:'cs_live_old'},null,false,409,0],
 [{status:'expired'},null,true,409,0],
 [{status:'complete'},null,false,409,0]
 ]){r=await scenario({existing:true,session,pi,rotateFail});assert.equal(r.statuses[0],status);assert.equal(r.creates,creates);if(creates)assert.deepEqual(r.keys,['fobur-live-course-rotated-key']);}
 console.log('20 mock scenarios passed; 20 concurrent handler calls, one mock creation');
})().catch(e=>{console.error(e);process.exitCode=1});

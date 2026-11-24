// Offline executable test harness. Run: node review/checkout-test.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/stripe-live-checkout.ts','utf8').replace(/^import .*;\s*$/gm,'').replace('error:string,status:number','error,status');
async function scenario(opts={}){
 let handler, reservation=null, creates=0, keys=[];
 const session={id:'cs_live_mock',livemode:true,client_reference_id:'mock-user',metadata:{course_id:'beginner-training-course',reservation_key:'mock-key'},status:'open',payment_status:'unpaid',url:'https://example.invalid/checkout',...opts.session};
 const env={STRIPE_LIVE_CHECKOUT_ENABLED:opts.disabled?'false':'true',STRIPE_SECRET_KEY:'sk_live_mock',SUPABASE_URL:'mock',SUPABASE_ANON_KEY:'mock-anon',SUPABASE_SERVICE_ROLE_KEY:'mock-service'};
 class Stripe{constructor(){this.checkout={sessions:{create:async(p,o)=>{creates++;keys.push(o.idempotencyKey);if(opts.timeout)throw Error('mock timeout');await Promise.resolve();return session;},retrieve:async()=>session}}}}
 const createClient=()=>({auth:{getUser:async()=>({data:{user:{id:'mock-user',is_anonymous:!!opts.anonymous}}})},rpc:async(name,p)=>{
 if(name==='reserve_live_course_checkout'){if(opts.dbFail)return {error:true};if(opts.owned)return {data:{result:'owned_or_paid'}};if(reservation)return {data:{result:'existing',...reservation}};reservation={reservation_key:'mock-key',stripe_session_id:null};return {data:{result:'create_once',...reservation}};}
 if(opts.attachFail)return {data:false};reservation.stripe_session_id=p.p_session;return {data:true};}});
 vm.runInNewContext(source,{Stripe,createClient,Deno:{serve:f=>handler=f,env:{get:k=>env[k]}},Response,console:{error(){}}});
 const invoke=()=>handler(new Request('https://example.invalid',{method:'POST',headers:{origin:opts.badOrigin?'https://example.invalid':'https://flatoutbuiltuproofing.co.uk',authorization:'Bearer mock','content-type':'application/json'},body:JSON.stringify({immediate_access_consent:!opts.noConsent,cancellation_acknowledgement:true,terms_accepted:true})}));
 const results=await Promise.all(Array.from({length:opts.parallel||1},invoke));
 const retry=opts.retry?await invoke():null;
 return {statuses:results.map(r=>r.status),retry:retry?.status,creates,keys};
}
(async()=>{
 let r=await scenario({parallel:20,retry:true});assert.equal(r.creates,1);assert.equal(r.statuses.filter(s=>s===200).length,1);assert.equal(r.retry,200);assert.deepEqual(r.keys,['fobur-live-course-mock-key']);
 for(const [opts,status,retry,creates] of [[{owned:true},409,undefined,0],[{noConsent:true},422,undefined,0],[{anonymous:true},401,undefined,0],[{disabled:true},503,undefined,0],[{badOrigin:true},403,undefined,0],[{dbFail:true},503,undefined,0],[{timeout:true,retry:true},503,409,1],[{attachFail:true,retry:true},503,409,1],[{session:{status:'expired'},retry:true},200,409,1],[{session:{client_reference_id:'wrong'},retry:true},200,409,1]]){r=await scenario(opts);assert.equal(r.statuses[0],status);assert.equal(r.retry,retry);assert.equal(r.creates,creates);}
 console.log('11 mock scenarios passed; 20 concurrent handler calls, one mock creation');
})().catch(e=>{console.error(e);process.exitCode=1});

// Task 34 isolated mock model; NEVER calls Stripe, Supabase or HTTP.
// This is a behavioural model of the deployed v24 Checkout and v25 webhook;
// it is NOT an execution of deployed Edge Function code.
const assert=require('node:assert/strict');
const course='beginner-training-course';
function system(){
 const reservations=new Map(), entitlements=new Set(), receipts=new Set();
 let creates=0, grants=0, emails=0;
 const stripe=new Map();
 const key=u=>u+':'+course;
 async function checkout(u,scenario='ok'){
  if(entitlements.has(key(u)))return {status:409,reason:'owned'};
  let r=reservations.get(key(u));
  if(r){
   if(r.state==='creating')return {status:409,reason:'pending'};
   if(r.state==='fulfilled')return {status:409,reason:'owned'};
   const s=stripe.get(r.session);
   if(!s||s.user!==u||s.course!==course||s.livemode!==false)return {status:409,reason:'mismatch'};
   if(s.paid||s.status!=='open')return {status:409,reason:'closed'};
   return {status:200,reason:'recovered',url:s.url};
  }
  r={state:'creating',id:'stable-'+u};reservations.set(key(u),r);
  if(scenario==='stripe_failure')return {status:503,reason:'uncertain'};
  creates++;
  const id='cs_test_mock_'+u;
  stripe.set(id,{user:u,course,livemode:false,paid:false,status:'open',url:'https://checkout.example/mock'});
  if(scenario==='attach_failure')return {status:503,reason:'attach_failed'};
  r.state='session_created';r.session=id;
  return {status:200,reason:'created'};
 }
 function webhook(u,id){
  const s=stripe.get(id);
  if(!s||!s.paid||s.user!==u||s.course!==course||s.livemode!==false)return {status:422};
  if(!entitlements.has(key(u))){entitlements.add(key(u));grants++;}
  const r=reservations.get(key(u));if(r&&r.session===id)r.state='fulfilled';
  if(!receipts.has(id)){receipts.add(id);emails++;}
  return {status:200};
 }
 return {checkout,webhook,stripe,entitlements,stats:()=>({creates,grants,emails}),reservations};
}
(async()=>{
 const s=system();s.entitlements.add('owner:'+course);
 assert.equal((await s.checkout('owner')).reason,'owned');
 const [a,b]=await Promise.all([s.checkout('parallel'),s.checkout('parallel')]);
 assert.equal(a.status,200);assert.equal(b.status,409);assert.equal(s.stats().creates,1);
 assert.equal((await s.checkout('parallel')).reason,'recovered');
 const f=system();assert.equal((await f.checkout('failure','stripe_failure')).status,503);
 assert.equal((await f.checkout('failure')).reason,'pending');assert.equal(f.stats().creates,0);
 const t=system();assert.equal((await t.checkout('attach','attach_failure')).status,503);
 assert.equal((await t.checkout('attach')).reason,'pending');assert.equal(t.stats().creates,1);
 const id='cs_test_mock_parallel';s.stripe.get(id).paid=true;s.stripe.get(id).status='complete';
 assert.equal(s.webhook('parallel',id).status,200);
 assert.equal(s.webhook('parallel',id).status,200);
 assert.equal(s.stats().grants,1);assert.equal(s.stats().emails,1);
 assert.equal((await s.checkout('parallel')).reason,'owned');
 const x=system();await x.checkout('wrong');assert.equal(x.webhook('other','cs_test_mock_wrong').status,422);
 console.log('PASS: 9 isolated mock assertions/scenarios; no network or payments');
})().catch(e=>{console.error(e);process.exitCode=1;});
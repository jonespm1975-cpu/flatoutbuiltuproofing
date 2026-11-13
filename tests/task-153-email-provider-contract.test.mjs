import test from 'node:test';
import assert from 'node:assert/strict';
// Offline-only model: does not call Resend, Stripe, or Supabase.
const safeId=/^[a-zA-Z0-9_-]{1,128}$/;
function parse({ok,status,body}) {
 if(!ok)return {accepted:false,id:null,reason:status===429||status>=500?'RETRYABLE':'REJECTED'};
 if(typeof body?.id!=='string'||!safeId.test(body.id))return {accepted:true,id:null,reason:'ID_MISSING'};
 return {accepted:true,id:body.id,reason:'ACCEPTED'};
}
function finish(q,r,p){
 if(q.status==='accepted'||r.status==='sent'||q.status!=='leased'||q.token!==r.claimToken)return {action:'none'};
 if(!p.accepted)return {action:'retry',attempts:q.attempts+1};
 return {action:'record_acceptance',providerMessageId:p.id,receiptStatus:'sent'};
}
const q={status:'leased',token:'synthetic',attempts:0},r={status:'pending',claimToken:'synthetic'},p=parse({ok:true,status:200,body:{id:'email_synthetic_123'}});
for(const [name,input,expected] of [
 ['accepted',{ok:true,status:200,body:{id:'email_synthetic_123'}},'ACCEPTED'],
 ['missing ID',{ok:true,status:200,body:{}},'ID_MISSING'],
 ['malformed ID',{ok:true,status:200,body:{id:'bad id'}},'ID_MISSING'],
 ['rate limit',{ok:false,status:429},'RETRYABLE'],
 ['server failure',{ok:false,status:503},'RETRYABLE'],
 ['invalid recipient',{ok:false,status:422},'REJECTED'],
 ['unauthorized',{ok:false,status:401},'REJECTED']
])test(name,()=>assert.equal(parse(input).reason,expected));
test('persist provider message ID',()=>assert.equal(finish(q,r,p).providerMessageId,'email_synthetic_123'));
test('accepted queue is not resent',()=>assert.equal(finish({...q,status:'accepted'},r,p).action,'none'));
test('sent receipt is not resent',()=>assert.equal(finish(q,{...r,status:'sent'},p).action,'none'));
test('wrong lease token cannot finish',()=>assert.equal(finish({...q,token:'wrong'},r,p).action,'none'));
test('provider failure models retry',()=>assert.equal(finish(q,r,{accepted:false}).attempts,1));
test('accepted is not delivered proof',()=>assert.equal(finish(q,r,p).receiptStatus,'sent'));
test('no email or secret output',()=>assert.ok(!JSON.stringify(finish(q,r,p)).includes('@')));

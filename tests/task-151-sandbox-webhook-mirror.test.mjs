// Standalone offline tests. No network calls, payments, emails or credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const syntheticUser='11111111-1111-4111-8111-111111111111';
const price='price_1UaRCSKS41qhUQTKl2uSNnYN';
const course='beginner-training-course';
const safeCodes=new Set(['SIGNATURE_INVALID','LIVE_EVENT_PROHIBITED','IGNORED_EVENT','IGNORED_MEMBERSHIP','NOT_PAID','UNLOCK_DISABLED','CUSTOMER_MAPPING_MISSING','CHECKOUT_FIELDS_MISMATCH','PRICE_LINE_ITEM_MISMATCH','UNKNOWN_CUSTOMER','VALIDATED']);
function validate({signed=true,livemode=false,type='checkout.session.completed',session={},lineItems=[],userExists=true,unlockEnabled=true}){
 if(!signed)return [400,'SIGNATURE_INVALID'];
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(type))return [200,'IGNORED_EVENT'];
 if(livemode)return [400,'LIVE_EVENT_PROHIBITED'];
 if(session.mode==='subscription')return [200,'IGNORED_MEMBERSHIP'];
 if(session.payment_status!=='paid')return [200,'NOT_PAID'];
 if(!unlockEnabled)return [503,'UNLOCK_DISABLED'];
 if(!uuid.test(session.client_reference_id??''))return [422,'CUSTOMER_MAPPING_MISSING'];
 const m=session.metadata??{};
 if(session.mode!=='payment'||session.currency!=='gbp'||session.amount_subtotal!==999||session.amount_total<999||m.supabase_user_id!==session.client_reference_id||m.course_id!==course||m.immediate_access_consent!=='true'||m.cancellation_acknowledgement!=='true'||m.terms_accepted!=='true'||!m.consent_recorded_at)return [422,'CHECKOUT_FIELDS_MISMATCH'];
 if(lineItems.length!==1||lineItems[0].price!==price||lineItems[0].quantity!==1)return [422,'PRICE_LINE_ITEM_MISMATCH'];
 if(!userExists)return [422,'UNKNOWN_CUSTOMER'];
 return [200,'VALIDATED'];
}
const good={session:{mode:'payment',payment_status:'paid',client_reference_id:syntheticUser,currency:'gbp',amount_subtotal:999,amount_total:999,metadata:{supabase_user_id:syntheticUser,course_id:course,immediate_access_consent:'true',cancellation_acknowledgement:'true',terms_accepted:'true',consent_recorded_at:'2026-11-11T19:38:58Z'}},lineItems:[{price,quantity:1}]};
const cases=[
 ['valid paid course',good,200,'VALIDATED'],
 ['subscription ignored',{session:{mode:'subscription',payment_status:'paid'}},200,'IGNORED_MEMBERSHIP'],
 ['invalid signature',{...good,signed:false},400,'SIGNATURE_INVALID'],
 ['live event',{...good,livemode:true},400,'LIVE_EVENT_PROHIBITED'],
 ['unknown event',{...good,type:'charge.succeeded'},200,'IGNORED_EVENT'],
 ['unpaid checkout',{...good,session:{...good.session,payment_status:'unpaid'}},200,'NOT_PAID'],
 ['disabled unlock',{...good,unlockEnabled:false},503,'UNLOCK_DISABLED'],
 ['missing mapping',{...good,session:{...good.session,client_reference_id:null}},422,'CUSTOMER_MAPPING_MISSING'],
 ['mismatched metadata user',{...good,session:{...good.session,metadata:{...good.session.metadata,supabase_user_id:'other'}}},422,'CHECKOUT_FIELDS_MISMATCH'],
 ['missing consent',{...good,session:{...good.session,metadata:{...good.session.metadata,terms_accepted:'false'}}},422,'CHECKOUT_FIELDS_MISMATCH'],
 ['tax inclusive 999 total',good,200,'VALIDATED'],
 ['tax exclusive 1199 total',{...good,session:{...good.session,amount_total:1199}},200,'VALIDATED'],
 ['wrong price',{...good,lineItems:[{price:'wrong',quantity:1}]},422,'PRICE_LINE_ITEM_MISMATCH'],
 ['extra line item',{...good,lineItems:[{price,quantity:1},{price,quantity:1}]},422,'PRICE_LINE_ITEM_MISMATCH'],
 ['wrong quantity',{...good,lineItems:[{price,quantity:2}]},422,'PRICE_LINE_ITEM_MISMATCH'],
 ['unknown customer',{...good,userExists:false},422,'UNKNOWN_CUSTOMER']
];
for(const [name,input,status,code] of cases)test(name,()=>assert.deepEqual(validate(input),[status,code]));
test('diagnostic output is restricted to status and fixed codes',()=>{for(const [,input] of cases){const result=validate(input);assert.equal(result.length,2);assert.ok(safeCodes.has(result[1]));assert.ok(!JSON.stringify(result).includes(syntheticUser));}});
// Mirror tests, not a deployment or Stripe signature/DB concurrency test.

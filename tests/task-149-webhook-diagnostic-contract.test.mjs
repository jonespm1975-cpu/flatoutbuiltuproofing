// Task 149: offline diagnostic-contract tests only. No Stripe/Supabase/Resend calls.
// Run: node --test tests/task-149-webhook-diagnostic-contract.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const expectedPrice = 'price_1UaRCSKS41qhUQTKl2uSNnYN';
const course = 'beginner-training-course';
const user = 'e3e7ec12-c5fa-4486-ad4f-8af5fcfa919e';
function classify({signed=true,livemode=false,type='checkout.session.completed',session={},lineItems=[],userExists=true,unlockEnabled=true}) {
  if (!signed) return [400,'SIGNATURE_INVALID'];
  if (livemode) return [400,'LIVE_EVENT_PROHIBITED'];
  if (!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(type)) return [200,'IGNORED_EVENT'];
  if (session.mode==='subscription') return [200,'IGNORED_MEMBERSHIP'];
  if (session.payment_status!=='paid') return [200,'NOT_PAID'];
  if (!unlockEnabled) return [503,'UNLOCK_DISABLED'];
  if (!uuid.test(session.client_reference_id??'')) return [422,'CUSTOMER_MAPPING_MISSING'];
  const m=session.metadata??{};
  if (session.mode!=='payment'||session.currency!=='gbp'||session.amount_subtotal!==999||session.amount_total<999||m.supabase_user_id!==session.client_reference_id||m.course_id!==course||m.immediate_access_consent!=='true'||m.cancellation_acknowledgement!=='true'||m.terms_accepted!=='true'||!m.consent_recorded_at) return [422,'CHECKOUT_FIELDS_MISMATCH'];
  if (lineItems.length!==1||lineItems[0].price!==expectedPrice||lineItems[0].quantity!==1) return [422,'PRICE_LINE_ITEM_MISMATCH'];
  if (!userExists) return [422,'UNKNOWN_CUSTOMER'];
  return [200,'VALIDATED'];
}
const good={session:{mode:'payment',payment_status:'paid',client_reference_id:user,currency:'gbp',amount_subtotal:999,amount_total:999,metadata:{supabase_user_id:user,course_id:course,immediate_access_consent:'true',cancellation_acknowledgement:'true',terms_accepted:'true',consent_recorded_at:'2026-11-11T19:38:58Z'}},lineItems:[{price:expectedPrice,quantity:1}]};
test('valid sandbox course fixture',()=>assert.deepEqual(classify(good),[200,'VALIDATED']));
test('subscription routed to course endpoint is ignored',()=>assert.deepEqual(classify({session:{mode:'subscription',payment_status:'paid'}}),[200,'IGNORED_MEMBERSHIP']));
test('invalid signature rejected',()=>assert.deepEqual(classify({...good,signed:false}),[400,'SIGNATURE_INVALID']));
test('live event prohibited',()=>assert.deepEqual(classify({...good,livemode:true}),[400,'LIVE_EVENT_PROHIBITED']));
test('missing mapping rejected',()=>assert.deepEqual(classify({...good,session:{...good.session,client_reference_id:null}}),[422,'CUSTOMER_MAPPING_MISSING']));
test('missing consent rejected',()=>assert.deepEqual(classify({...good,session:{...good.session,metadata:{...good.session.metadata,terms_accepted:'false'}}}),[422,'CHECKOUT_FIELDS_MISMATCH']));
test('wrong price rejected',()=>assert.deepEqual(classify({...good,lineItems:[{price:'wrong',quantity:1}]}),[422,'PRICE_LINE_ITEM_MISMATCH']));
test('unknown customer rejected',()=>assert.deepEqual(classify({...good,userExists:false}),[422,'UNKNOWN_CUSTOMER']));
test('disabled fulfilment returns retryable 503',()=>assert.deepEqual(classify({...good,unlockEnabled:false}),[503,'UNLOCK_DISABLED']));
test('diagnostic output contains no customer identifiers',()=>{const result=JSON.stringify(classify(good));assert.ok(!result.includes(user));assert.ok(!result.includes('email'));});
// This is a pure mirror of current known validation branches, NOT execution of deployed Edge Function.

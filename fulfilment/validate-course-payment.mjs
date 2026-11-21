/** Staging-only pure validation core. No Stripe calls, payment writes, or live configuration changes. */
export const COURSES = Object.freeze([
  "built-up-01",
  "built-up-02",
  "built-up-03",
  "built-up-04",
  "built-up-05",
  "built-up-06",
  "tile-slate-01",
  "tile-slate-02",
  "tile-slate-03",
  "tile-slate-04",
  "tile-slate-05",
  "tile-slate-06",
  "metal-sheet-01",
  "metal-sheet-02",
  "metal-sheet-03",
  "metal-sheet-04",
  "metal-sheet-05",
  "metal-sheet-06",
  "liquid-applied-01",
  "liquid-applied-02",
  "liquid-applied-03",
  "liquid-applied-04",
  "liquid-applied-05",
  "liquid-applied-06"
]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/**
 * Fail closed unless a course has both published content and its unique Stripe Price ID.
 * Active Stripe Price IDs must be configured server-side; never supplied by the browser.
 * Input lineItems must come from Stripe API, never Checkout metadata.
 */
export function validateCoursePayment({event,session,lineItems,courseConfig,expectedLivemode=false}){
  if(!event || !session || !Array.isArray(lineItems)) return {ok:false,reason:"missing_evidence"};
  if(!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)) return {ok:false,reason:"unsupported_event"};
  if(event.livemode!==expectedLivemode || session.livemode!==expectedLivemode) return {ok:false,reason:"wrong_environment"};
  if(session.mode!=="payment" || session.payment_status!=="paid") return {ok:false,reason:"not_paid"};
  if(!/^cs_(test_|live_)/.test(session.id||"")) return {ok:false,reason:"invalid_session"};
  if(session.currency!=="gbp" || session.amount_subtotal!==999 || session.amount_total<999) return {ok:false,reason:"amount_mismatch"};
  if(session.payment_link) return {ok:false,reason:"unmapped_payment_link"};
  const userId=session.client_reference_id;
  if(!uuid.test(userId||"") || session.metadata?.supabase_user_id!==userId) return {ok:false,reason:"user_mismatch"};
  const courseId=session.metadata?.course_id;
  if(!COURSES.includes(courseId)) return {ok:false,reason:"unknown_course"};
  const cfg=courseConfig?.[courseId];
  if(cfg?.status!=="published" || cfg?.checkout_enabled!==true || cfg?.content_verified!==true || !/^price_/.test(cfg.price_id||"")) return {ok:false,reason:"course_not_ready"};
  const consent=session.metadata||{};
  if(consent.terms_accepted!=="true" || consent.immediate_access_consent!=="true" || consent.cancellation_acknowledgement!=="true" || !Number.isFinite(Date.parse(consent.consent_recorded_at||""))) return {ok:false,reason:"consent_missing"};
  if(expectedLivemode && (consent.eligibility_policy!=="uk-address-v1" || (session.collected_information?.shipping_details?.address?.country??session.shipping_details?.address?.country)!=="GB")) return {ok:false,reason:"uk_eligibility_missing"};
  if(lineItems.length!==1 || lineItems[0]?.price?.id!==cfg.price_id || lineItems[0]?.quantity!==1) return {ok:false,reason:"wrong_price"};
  return {ok:true,course_id:courseId,user_id:userId,session_id:session.id,amount_pence:session.amount_total,consent_recorded_at:consent.consent_recorded_at};
}
/** Database persistence requirement: UNIQUE(user_id, course_id) for entitlement,
 * UNIQUE(stripe_checkout_session_id) for confirmation, and an outbox claim lease.
 * Never grant access from a browser success URL. Check confirmed paid status in signed webhook.
 */
import {validateCoursePayment} from "./validate-course-payment.mjs";
/** Pure preparation of a signed, independently verified Stripe webhook event.
 * Caller must verify Stripe-Signature via Stripe SDK, retrieve line items from Stripe,
 * resolve trusted server-side course config, then persist receipt idempotently.
 * This module performs no database changes or network calls.
 */
export function prepareFulfilmentRecord({event,session,lineItems,courseConfig,courseTitles,expectedLivemode=false}){
  const check=validateCoursePayment({event,session,lineItems,courseConfig,expectedLivemode});
  if(!check.ok) return check;
  const title=courseTitles?.[check.course_id];
  if(typeof title!=="string" || title.trim().length<3) return {ok:false,reason:"missing_trusted_title"};
  return {ok:true,record:{
    stripe_checkout_session_id:check.session_id,
    user_id:check.user_id,
    course_id:check.course_id,
    course_title:title,
    paid_amount_pence:check.amount_pence,
    currency:"gbp",
    consent_recorded_at:check.consent_recorded_at,
    terms_version:"staging-24-course-v1",
    // Confirmation write is idempotent by Stripe session, entitlement by (user,course).
    // The business must agree whether paid access is granted before email acceptance.
    required_unique_keys:["stripe_checkout_session_id","user_id,course_id"]
  }};
}

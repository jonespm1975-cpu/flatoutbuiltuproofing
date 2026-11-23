/** Staging-only 24-course email and entitlement routing. No provider requests or DB writes. */
const slugs=["built-up","tile-slate","metal-sheet","liquid-applied"];
export const acceptedCourses=new Set(slugs.flatMap(prefix=>Array.from({length:6},(_,i)=>prefix+"-"+String(i+1).padStart(2,"0"))));
export function buildCourseConfirmation({receipt,catalogue}){
 const session=receipt?.stripe_checkout_session_id;
 if(typeof session!=="string"||!session.startsWith("cs_test_")) return {ok:false,reason:"sandbox_only"};
 if(!acceptedCourses.has(receipt?.course_id)) return {ok:false,reason:"unknown_course"};
 if(receipt?.paid_amount_pence!==999||receipt?.currency!=="gbp"||receipt?.terms_version!=="staging-24-course-v1")return {ok:false,reason:"invalid_receipt"};
 const course=catalogue?.courses?.find(c=>c.course_id===receipt.course_id);
 if(!course || typeof course.title!=="string" || course.title.length<3) return {ok:false,reason:"missing_catalogue_title"};
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(receipt.user_id||""))return {ok:false,reason:"missing_owner"};
 return {ok:true,confirmation:{
  session_id:session,user_id:receipt.user_id,course_id:course.course_id,
  course_title:course.title,
  email_subject:"Your Flat Out Roofing course confirmation",
  customer_text:[
   "Flat Out Roofing — course purchase confirmation",
   "Course: "+course.title,
   "Purchase: £9.99 one-time payment. No recurring membership charge is included.",
   "To access your purchased lesson, sign in to My Learning.",
   "The course contains educational material only; it does not certify competence.",
   "Your cancellation information, terms and details of digital-content consent are provided with the order."
  ].join("\n"),
  idempotency_key:"course-confirmation-"+session
 }};
}
export function planOwnedCourseAccess({receipt,existingEntitlements=[]}){
 if(!receipt || !acceptedCourses.has(receipt.course_id) || !receipt.stripe_checkout_session_id?.startsWith("cs_test_")
    || receipt.paid_amount_pence!==999 || receipt.currency!=="gbp" || receipt.terms_version!=="staging-24-course-v1")
    return {ok:false,reason:"invalid_verified_receipt"};
 const key=receipt.user_id+"|"+receipt.course_id;
 const exists=existingEntitlements.some(r=>r.user_id+"|"+r.course_id===key);
 return {ok:true,already_owned:exists,user_id:receipt.user_id,course_id:receipt.course_id,
   stripe_checkout_session_id:receipt.stripe_checkout_session_id};
}

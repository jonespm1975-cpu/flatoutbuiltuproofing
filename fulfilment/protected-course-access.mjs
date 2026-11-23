/** Pure fail-closed gating logic for 24 separate paid courses.
 * Identity must be supplied by a VERIFIED Supabase auth.getUser call.
 * Entitlements must come from the current-user RLS-controlled course_access query,
 * not browser-supplied claims, membership status or Stripe success redirects.
 */
export const CATEGORIES=Object.freeze(["built-up","tile-slate","metal-sheet","liquid-applied"]);
export const COURSE_IDS=Object.freeze(CATEGORIES.flatMap(group=>Array.from({length:6},(_,i)=>group+"-"+String(i+1).padStart(2,"0"))));
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function decideCourseAccess({courseId,verifiedUserId,entitlements,content,environment="test"}={}){
 if(!COURSE_IDS.includes(courseId))return {status:404,code:"unknown_course"};
 if(!UUID.test(verifiedUserId||""))return {status:401,code:"sign_in_required"};
 if(!Array.isArray(entitlements))return {status:503,code:"access_check_unavailable"};
 // Reject a cross-user row even if a caller accidentally returns one.
 const owned=entitlements.some(e=>e?.user_id===verifiedUserId && e?.course_id===courseId
    && typeof e?.stripe_checkout_session_id==="string"
    && e.stripe_checkout_session_id.startsWith(environment==="live"?"cs_live_":"cs_test_"));
 if(!owned)return {status:403,code:"course_not_owned"};
 if(content?.course_id!==courseId||content?.verified!==true||content?.published!==true
   ||typeof content?.title!=="string"||!Array.isArray(content?.sections)
   ||content.sections.length<2)return {status:503,code:"content_not_published"};
 return {status:200,code:"ok",lesson:{course_id:courseId,title:content.title,sections:content.sections}};
}

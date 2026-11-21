/** Pure server-side sandbox checkout resolver. Never trust price IDs from a browser. */
export function validateCatalogue(catalogue) {
  const rows = catalogue?.courses;
  if (!Array.isArray(rows) || rows.length!==24) return {ok:false,reason:"invalid_course_count"};
  const seenIds=new Set(), seenPrices=new Set();
  for(const row of rows){
    if(typeof row.course_id!=="string" || seenIds.has(row.course_id)) return {ok:false,reason:"duplicate_or_missing_course_id"};
    seenIds.add(row.course_id);
    if(row.currency!=="gbp" || row.price_pence!==999 || row.entitlement_type!=="one_time_individual") return {ok:false,reason:"price_contract_mismatch"};
    if(row.checkout_enabled===true){
      if(row.status!=="published" || row.content_status!=="verified" || typeof row.stripe_price_id_test!=="string" || !/^price_/.test(row.stripe_price_id_test))
        return {ok:false,reason:"enabled_course_incomplete"};
      if(seenPrices.has(row.stripe_price_id_test)) return {ok:false,reason:"duplicate_sandbox_price"};
      seenPrices.add(row.stripe_price_id_test);
    }
  }
  return {ok:true,count:seenIds.size,enabled:seenPrices.size};
}
/**
 * Returns a plan only, not a Checkout URL. Recheck identity and ownership server-side
 * and reserve atomically before calling Stripe.
 */
export function prepareSandboxCheckout({catalogue,courseId,userId,consent,alreadyOwned=false}){
  const checked=validateCatalogue(catalogue);
  if(!checked.ok) return {ok:false,reason:checked.reason};
  if(typeof userId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId))
    return {ok:false,reason:"authenticated_user_required"};
  if(typeof courseId!=="string" || !catalogue.courses.some(c=>c.course_id===courseId)) return {ok:false,reason:"unknown_course"};
  if(alreadyOwned) return {ok:false,reason:"already_owned"};
  const row=catalogue.courses.find(c=>c.course_id===courseId);
  if(row.status!=="published" || row.content_status!=="verified" || row.checkout_enabled!==true || typeof row.stripe_price_id_test!=="string")
    return {ok:false,reason:"course_not_published"};
  if(consent?.terms_accepted!==true || consent?.immediate_access_consent!==true || consent?.cancellation_acknowledgement!==true)
    return {ok:false,reason:"consent_missing"};
  return {ok:true,courseId:row.course_id,priceId:row.stripe_price_id_test,currency:"gbp",unitAmount:999,userId};
}

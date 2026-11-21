/**
 * Staging-only adapter between verified Stripe webhook routing and an atomic
 * Supabase database RPC. Does not modify any table or call any real service.
 *
 * The caller must use verified Stripe event/session/line-items and
 * prepareFulfilmentRecord(). This adapter must NOT accept public browser input.
 *
 * atomicRecord is a service-role-only RPC implementing one database transaction:
 *  1. insert purchase_confirmations keyed by stripe_checkout_session_id;
 *  2. if conflict, read and compare immutable owner/course/amount/currency;
 *  3. only acknowledge same owner/course/amount/currency as a duplicate;
 *  4. enqueue one email via existing trigger (no outbound email in this call);
 *  5. never grant paid content from a browser success page.
 * A dedicated sandbox receipt worker must be made course-aware before enabling.
 */
const COURSE_IDS = new Set([
  ...Array.from({length:6},(_,i)=>"built-up-"+String(i+1).padStart(2,"0")),
  ...Array.from({length:6},(_,i)=>"tile-slate-"+String(i+1).padStart(2,"0")),
  ...Array.from({length:6},(_,i)=>"metal-sheet-"+String(i+1).padStart(2,"0")),
  ...Array.from({length:6},(_,i)=>"liquid-applied-"+String(i+1).padStart(2,"0"))
]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function makeSandboxReceiptAdapter(atomicRecord){
  if(typeof atomicRecord!=="function") throw new Error("Atomic database writer required");
  return async function persistConfirmation(record,eventId){
    if(!record || typeof eventId!=="string" || !/^evt_/.test(eventId) ||
       typeof record.stripe_checkout_session_id!=="string" ||
       !record.stripe_checkout_session_id.startsWith("cs_test_") ||
       !UUID.test(record.user_id||"") || !COURSE_IDS.has(record.course_id) ||
       record.paid_amount_pence!==999 || record.currency!=="gbp" ||
       record.terms_version!=="staging-24-course-v1" ||
       !Number.isFinite(Date.parse(record.consent_recorded_at||""))){
      throw new Error("Untrusted or incomplete sandbox receipt");
    }
    // Explicit, small set of values: no raw customer metadata, amount or title override.
    const verified={
      stripe_checkout_session_id:record.stripe_checkout_session_id,
      user_id:record.user_id,course_id:record.course_id,
      paid_amount_pence:999,currency:"gbp",
      consent_recorded_at:record.consent_recorded_at,
      terms_version:"staging-24-course-v1"
    };
    const response=await atomicRecord(verified,eventId);
    if(!response || !["inserted","already_recorded"].includes(response.status))
      throw new Error("Database operation not committed");
    if(response.status==="already_recorded"){
      const old=response.record;
      if(!old || old.stripe_checkout_session_id!==verified.stripe_checkout_session_id ||
         old.user_id!==verified.user_id || old.course_id!==verified.course_id ||
         old.paid_amount_pence!==999 || old.currency!=="gbp" ||
         old.terms_version!==verified.terms_version)
        throw new Error("Conflicting receipt identity; manual reconciliation required");
    }
    return response;
  };
}

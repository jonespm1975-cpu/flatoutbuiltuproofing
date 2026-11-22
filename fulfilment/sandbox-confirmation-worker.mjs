import {buildCourseConfirmation} from "./course-confirmation-routing.mjs";

/**
 * Isolated 24-course sandbox confirmation worker. NO real sender or database attached.
 * The runtime must inject an atomic database lease/claim and a provider adapter;
 * production scheduling must remain disabled. Never email from a webhook request.
 *
 * The claim adapter MUST atomically reserve a unique session with a lease token,
 * and finish MUST update under (session,token) CAS to prevent stale-worker writes.
 */
export async function runSandboxConfirmationBatch({
  catalogue,claimDue,loadReceipt,loadCustomerEmail,sendConfirmation,finishClaim,maxJobs=2
}={}){
  if(!Array.isArray(catalogue?.courses)||catalogue.courses.length!==24 ||
     ![claimDue,loadReceipt,loadCustomerEmail,sendConfirmation,finishClaim].every(x=>typeof x==="function") ||
     !Number.isInteger(maxJobs)||maxJobs<1||maxJobs>5)
    return {ok:false,reason:"worker_configuration_missing"};
  let claims;
  try{claims=await claimDue(maxJobs);}
  catch{return {ok:false,reason:"atomic_claim_unavailable"};}
  if(!Array.isArray(claims)||claims.length>maxJobs)
    return {ok:false,reason:"invalid_claims"};
  const summary={ok:true,claimed:0,accepted:0,rejected:0,uncertain:0,finish_errors:0};
  const seen=new Set();
  for(const job of claims){
    const session=job?.session_id,token=job?.claim_token;
    if(typeof session!=="string"||!/^cs_test_[A-Za-z0-9_-]+$/.test(session)||
       typeof token!=="string"||token.length<12||seen.has(session)){
      summary.rejected++;continue;
    }
    seen.add(session);summary.claimed++;
    let outcome="rejected",providerId=null,reason="unknown_error",sendStarted=false;
    try{
      const receipt=await loadReceipt(session);
      const prepared=buildCourseConfirmation({receipt,catalogue});
      if(!prepared.ok || prepared.confirmation.session_id!==session){
        reason=prepared.reason||"receipt_mismatch";
      }else{
        const email=await loadCustomerEmail(prepared.confirmation.user_id);
        if(typeof email!=="string"||email.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
          reason="verified_customer_email_missing";
        }else{
          // sendConfirmation must only return provider-accepted data, not a guessed success.
          sendStarted=true;
          const delivered=await sendConfirmation({
            to:email,subject:prepared.confirmation.email_subject,
            text:prepared.confirmation.customer_text,
            idempotencyKey:prepared.confirmation.idempotency_key,
            courseId:prepared.confirmation.course_id,
            stripeSessionId:session
          });
          if(delivered?.accepted===true && typeof delivered.provider_id==="string" &&
             delivered.provider_id.length>2){
            outcome="accepted";providerId=delivered.provider_id;reason=null;
          }else {outcome="uncertain";reason="provider_acceptance_unconfirmed";}
        }
      }
    }catch{if(sendStarted){outcome="uncertain";reason="provider_response_ambiguous";}else reason="provider_or_data_error";}
    // A rejected attempt MUST be recorded by atomic finish, permitting the DB's
    // existing lease expiry, bounded retry and reconciliation policy.
    try{
      const result=await finishClaim({sessionId:session,claimToken:token,status:outcome,
        providerId,errorCode:reason});
      if(result?.committed!==true){summary.finish_errors++;continue;}
      if(outcome==="accepted")summary.accepted++;
      else if(outcome==="uncertain")summary.uncertain++;
      else summary.rejected++;
    }catch{summary.finish_errors++;}
  }
  return summary;
}

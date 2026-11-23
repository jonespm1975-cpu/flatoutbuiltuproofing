/** Mandatory, fail-closed release evidence: review signatures are recorded externally,
 * not self-certified by customer claims. No API, secret, live purchase or DB writes here.
 */
export const COURSE_IDS=Object.freeze(["built-up","tile-slate","metal-sheet","liquid-applied"]
 .flatMap(name=>Array.from({length:6},(_,i)=>name+"-"+String(i+1).padStart(2,"0"))));
export function assessTwentyFourCourseRelease({catalogue,technicalEvidence={},priceEvidence={},environmentEvidence={},ownerFinalApproval=false}={}){
 const failures=[];
 const rows=catalogue?.courses;
 if(!Array.isArray(rows)||rows.length!==24)return {ready:false,failures:["catalogue_must_have_24_courses"],counts:{total:0,ready:0}};
 const ids=new Set(),prices={live:new Set(),test:new Set()};
 let eligible=0;
 for(const row of rows){
  if(!COURSE_IDS.includes(row.course_id)||ids.has(row.course_id)){
   failures.push("duplicate_or_unknown_course:"+String(row.course_id));continue;
  }
  ids.add(row.course_id);
  const id=row.course_id,review=technicalEvidence[id],price=priceEvidence[id];
  let passed=true;
  const block=(reason)=>{failures.push(id+":"+reason);passed=false;};
  if(row.price_pence!==999||row.currency!=="gbp"||row.entitlement_type!=="one_time_individual")block("price_model_invalid");
  if(row.status!=="published"||row.content_status!=="verified"||row.checkout_enabled!==true)block("course_unpublished");
  if(!review?.qualified_reviewer||!review?.manufacturer_or_system||!review?.document_revision||
    !review?.signed_review_reference||review?.approval_status!=="approved"||review?.drawing_verified!==true||
    review?.assessment_verified!==true)block("qualified_technical_signoff_missing");
  if(!price||!price.test||!price.live)block("both_stripe_prices_missing");
  else for(const env of ["test","live"]){
   const p=price[env];
   if(typeof p.id!=="string"||!/^price_[A-Za-z0-9]+$/.test(p.id)||
       p.amount_pence!==999||p.currency!=="gbp"||p.type!=="one_time"||
       p.environment!==env||prices[env].has(p.id)){
     block(env+"_price_invalid_or_duplicate");
   }else prices[env].add(p.id);
  }
  if(passed)eligible++;
 }
 if(ids.size!==24)failures.push("course_set_incomplete");
 const envs=["isolated_supabase_sandbox","real_signed_stripe_test_webhook",
   "atomic_two_connection_db_test","purchased_course_only_access",
   "unowned_course_denial","provider_confirmed_test_email",
   "gb_eligibility_checked","legal_consent_checked","no_public_paid_content"];
 for(const key of envs)if(environmentEvidence[key]!==true)failures.push("global:"+key+"_not_proven");
 if(ownerFinalApproval!==true)failures.push("global:owner_final_release_approval_missing");
 return {ready:failures.length===0,failures,counts:{total:24,ready:eligible}};
}

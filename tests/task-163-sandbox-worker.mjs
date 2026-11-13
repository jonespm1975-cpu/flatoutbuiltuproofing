export async function processClaim({claim, db, resend, now=()=>Date.now()}) {
 if(!claim || !claim.session_id?.startsWith('cs_test_') || !claim.claim_token) return {status:'blocked'};
 const receipt=await db.getReceipt(claim.session_id);
 if(!receipt || receipt.terms_version!=='sandbox-test' || receipt.confirmation_email_status!=='pending') return {status:'blocked'};
 const queue=await db.getQueue(claim.session_id);
 if(!queue || queue.status!=='leased' || queue.lease_token!==claim.claim_token || Date.parse(queue.lease_until)<=now()) return {status:'blocked'};
 const result=await resend.send({idempotencyKey:'sandbox-course-confirmation-'+claim.session_id});
 if(result.uncertain) return {status:'needs_reconciliation'};
 if(!result.ok) {
   await db.finish({session:claim.session_id,token:claim.claim_token,accepted:false,error:'provider_rejected'});
   return {status:'rejected'};
 }
 const id=result.body?.id;
 if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{6,128}$/.test(id)) return {status:'needs_reconciliation'};
 const committed=await db.finish({session:claim.session_id,token:claim.claim_token,accepted:true,providerId:id});
 return committed?{status:'accepted',providerId:id}:{status:'needs_reconciliation'};
}

import {createClient} from "npm:@supabase/supabase-js@2.49.4";
import { contractAttachments } from "./contract-snapshot.ts";
const reply=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),url=Deno.env.get("SUPABASE_URL");
 if(!key||!url)return reply({error:"Unavailable"},503);
 const authorization=req.headers.get("authorization")||"";
 if(!authorization.startsWith("Bearer "))return reply({error:"Unauthorised"},401);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:authorised,error:authError}=await db.rpc("verify_live_purchase_email_worker_cron_token",{p_token:authorization.slice(7)});
 if(authError||authorised!==true)return reply({error:"Unauthorised"},401);
 // Deployment is not activation: both independent switches must be enabled by the operator.
 const enabled=Deno.env.get("LIVE_PURCHASE_EMAIL_WORKER_ENABLED")==="true"&&Deno.env.get("LIVE_PURCHASE_EMAIL_SENDING_ENABLED")==="true";
 if(!enabled)return reply({mode:"live-email-worker",enabled:false,claimed:0,sent:0,note:"Disabled; no email or queue operations performed."});
 const resend=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("PURCHASE_CONFIRMATION_FROM");
 if(!resend||!from)return reply({error:"Email provider unavailable"},503);
 const {data:claims,error:claimError}=await db.rpc("claim_live_purchase_email_retry",{p_limit:2});
 if(claimError)return reply({error:"Unable to claim mail jobs"},503);
 let accepted=0,failed=0;
 for(const job of claims||[]){
   const session=String(job.session_id||"");
   const token=String(job.claim_token||"");
   if(!session.startsWith("cs_live_")||!token){failed++;continue;}
   let providerId:string|null=null,reason:string|null=null;
   try{
     const {data:receipt,error}=await db.from("purchase_confirmations")
       .select("user_id,course_id,paid_amount_pence,currency,consent_recorded_at,confirmation_email_status,terms_version")
       .eq("stripe_checkout_session_id",session).single();
     if(error||!receipt||receipt.confirmation_email_status!=="pending"||receipt.terms_version==="sandbox-test"||
       receipt.paid_amount_pence!==999||receipt.currency!=="gbp"||receipt.course_id!=="beginner-training-course")throw new Error("Receipt is not eligible");
     const {data:identity,error:identityError}=await db.auth.admin.getUserById(receipt.user_id);
     if(identityError||!identity.user?.email)throw new Error("Customer email is unavailable");
     const body=[
       "Flat Out Built-Up Roofing — course purchase confirmation",
       "Course: Beginner Training Course, Lesson 1 — Roof Inspection and Planning",
       "Format: One written lesson with a short knowledge check, in English. A compatible browser, JavaScript and internet access are required. Access is provided through your signed-in account.","Total paid: £9.99 in one payment. The seller is not VAT registered and no VAT was charged.",
       "Seller: Paul Jones trading as Flat Out Built-Up Roofing, 52 Bedhampton Way, Leigh Park, Havant, Hampshire, PO9 2DP, United Kingdom. Stripe processes the payment.","Order: "+session,
       "To access your paid lesson, sign in at https://flatoutbuiltuproofing.co.uk/members.html",
       "You accepted the terms and consented to immediate delivery during the 14-day cancellation period. You acknowledged that, where the legal requirements are met, you lose the right to cancel once supply begins.",
       "Your consent and acknowledgement were recorded at "+receipt.consent_recorded_at+". Your statutory rights for faulty or misdescribed digital content still apply.",
       "The attached terms and cancellation policy are your copy to keep. Contact us by email if you need help accessing the lesson or want to exercise a cancellation right.",
       "Access is intended for the lifetime of the learning service while it operates, subject to your statutory rights.",
       "Terms: https://flatoutbuiltuproofing.co.uk/terms.html",
       "Cancellation information: https://flatoutbuiltuproofing.co.uk/refunds.html",
       "Contact: jonespm1975@gmail.com"
     ].join("\n");
     const r=await fetch("https://api.resend.com/emails",{method:"POST",signal:AbortSignal.timeout(10000),headers:{
       Authorization:"Bearer "+resend,"Content-Type":"application/json","Idempotency-Key":"course-confirmation-"+session
     },body:JSON.stringify({from,to:[identity.user.email],subject:"Your Flat Out Built-Up Roofing course purchase confirmation",text:body,attachments:contractAttachments})});
     const result=await r.json().catch(()=>({}));
     if(!r.ok||typeof result.id!=="string"||!result.id)throw new Error("Provider did not confirm acceptance");
     providerId=result.id;
   }catch(e){reason=e instanceof Error?e.message:"Email delivery failed";}
   const {data:finished,error:finishError}=await db.rpc("finish_live_purchase_email_retry",{
     p_session:session,p_token:token,p_accepted:providerId!==null,p_provider_id:providerId,p_error:reason
   });
   if(finishError||finished!==true){console.error("Email retry finalization failed",session);failed++;}
   else if(providerId)accepted++;else failed++;
 }
 return reply({mode:"live-email-worker",enabled:true,claimed:(claims||[]).length,provider_accepted:accepted,failed,scheduler_enabled:true,note:"Provider acceptance does not by itself prove inbox delivery."});
});

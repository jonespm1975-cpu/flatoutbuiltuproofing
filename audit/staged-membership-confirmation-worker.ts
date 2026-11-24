import {createClient} from "npm:@supabase/supabase-js@2.49.4";
// Hard release interlock: no membership email can be claimed or sent until separately tested.
const RELEASE_APPROVED=false;
const json=(status:number,value:Record<string,unknown>)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}});
async function authorised(value:string){
 const expected=Deno.env.get("MEMBERSHIP_CONFIRMATION_WORKER_KEY_SHA256")||"";
 if(!value||value.length>512||!/^[0-9a-f]{64}$/.test(expected))return false;
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 const actual=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
 let difference=0;for(let i=0;i<64;i++)difference|=actual.charCodeAt(i)^expected.charCodeAt(i);
 return difference===0;
}
const escapeHtml=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
Deno.serve(async req=>{
 if(req.method!=="POST")return json(405,{error:"Method not allowed"});
 if(!await authorised(req.headers.get("x-fobur-worker-key")||""))return json(401,{error:"Unauthorized"});
 const checkOnly=req.headers.get("x-fobur-check-only")==="true";
 if(!checkOnly&&(!RELEASE_APPROVED||Deno.env.get("MEMBERSHIP_CONFIRMATION_DELIVERY_ENABLED")!=="true"))return json(503,{status:"disabled"});
 const token=Deno.env.get("POSTMARK_SERVER_TOKEN")||"",sender=Deno.env.get("FUTURE_CONFIRMATION_FROM")||"",db=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(token.length<12||token==="POSTMARK_API_TEST"||!/^[^@\s]+@flatoutbuiltuproofing\.co\.uk$/i.test(sender)||!db||!key)return json(503,{error:"Sender configuration unavailable"});
 const admin=createClient(db,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.rpc("claim_membership_confirmation",{p_limit:checkOnly?0:1});
 if(error||!Array.isArray(data))return json(503,{error:"Queue unavailable"});
 if(checkOnly)return data.length===0?json(200,{status:"membership_queue_ready",sending_enabled:RELEASE_APPROVED&&Deno.env.get("MEMBERSHIP_CONFIRMATION_DELIVERY_ENABLED")==="true"}):json(503,{error:"Unexpected queue response"});
 if(data.length===0)return json(200,{status:"idle"});
 const job=data[0];
 async function finish(outcome:"accepted"|"review",id:string|null){
  const result=await admin.rpc("finish_membership_confirmation",{p_subscription_id:job.subscription_id,p_claim_token:job.claim_token,p_outcome:outcome,p_provider_message_id:id});
  return !result.error&&result.data===true;
 }
 if(job.paid_pence!==500||job.currency!=="gbp"||!/^sub_[A-Za-z0-9_]+$/.test(job.subscription_id)||!/^in_[A-Za-z0-9_]+$/.test(job.invoice_id)||!(/^[^@\s]+@[^@\s]+\.[^@\s]+$/).test(job.recipient)||typeof job.terms_text!=="string"||job.terms_text.length<100||job.terms_version!=="membership-2026-11-24-v1"||!Number.isFinite(Date.parse(job.consented_at))||!Number.isFinite(Date.parse(job.next_payment_at))){
  await finish("review",null);return json(422,{status:"review"});
 }
 const body=["Flat Out Built-Up Roofing — Learning Pass membership confirmation","Initial payment received: £5.00 GBP. This is a recurring monthly subscription; no additional payment is being requested by this email.","Subscription reference: "+job.subscription_id,"Invoice reference: "+job.invoice_id,"Next scheduled billing date at confirmation: "+new Date(job.next_payment_at).toISOString(),"Account email: "+job.recipient,"Agreed terms version: "+job.terms_version,"Consent recorded: "+new Date(job.consented_at).toISOString(),"Manage membership: https://flatoutbuiltuproofing.co.uk/members.html","Contact: flatoutbuiltuproofing@gmail.com","Your agreed contract terms and cancellation information:",job.terms_text].join("\n\n");
 try{
  const response=await fetch("https://api.postmarkapp.com/email",{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json","X-Postmark-Server-Token":token},body:JSON.stringify({From:sender,To:job.recipient,ReplyTo:"flatoutbuiltuproofing@gmail.com",Subject:"Flat Out Built-Up Roofing — £5 monthly membership confirmation",TextBody:body,HtmlBody:'<html lang="en-GB"><body>'+body.split("\n\n").map(x=>"<p>"+escapeHtml(x).replaceAll("\n","<br>")+"</p>").join("")+"</body></html>",MessageStream:"outbound",Tag:"membership-contract-confirmation",TrackOpens:false,TrackLinks:"None"}),signal:AbortSignal.timeout(15000)});
  const reply=await response.json();
  if(response.ok&&reply?.ErrorCode===0&&typeof reply.MessageID==="string"&&reply.MessageID&&typeof reply.To==="string"&&reply.To.trim().toLowerCase()===job.recipient.toLowerCase()){
   return await finish("accepted",reply.MessageID)?json(200,{status:"provider_accepted",delivered:false}):json(503,{status:"reconciliation_required"});
  }
  await finish("review",null);return json(502,{status:"review"});
 }catch{await finish("review",null);return json(502,{status:"review"});}
});
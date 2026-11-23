// DEPLOYED but OFF: no scheduler, no approved sender credentials, no delivery flag.
// Postmark transport approved by owner; domain authentication remains pending.
// Intentionally separate from the retired provider and historical accepted queue.
// This endpoint NEVER creates entitlements and never accesses Stripe.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { buildDurableEmail } from "./mail-content.ts";

const json=(code:number,body:Record<string,unknown>)=>
  new Response(JSON.stringify(body),{status:code,headers:{
    "content-type":"application/json","cache-control":"no-store",
    "x-content-type-options":"nosniff"
  }});

async function sameSecret(candidate:string,required:string){
  if(!candidate||!required)return false;
  const enc=new TextEncoder();
  const [a,b]=await Promise.all([
    crypto.subtle.digest("SHA-256",enc.encode(candidate)),
    crypto.subtle.digest("SHA-256",enc.encode(required))
  ]);
  const left=new Uint8Array(a),right=new Uint8Array(b);
  let diff=candidate.length^required.length;
  for(let i=0;i<left.length;i++)diff|=left[i]^right[i];
  return diff===0;
}

Deno.serve(async req=>{
  if(req.method!=="POST")return json(405,{error:"Method not allowed"});
  const workerKey=Deno.env.get("FUTURE_CONFIRMATION_WORKER_KEY")||"";
  const presented=req.headers.get("x-fobur-worker-key")||"";
  if(!await sameSecret(presented,workerKey))return json(401,{error:"Unauthorized"});
  // Explicitly OFF until the owner selects and verifies this replacement provider.
  if(Deno.env.get("FUTURE_CONFIRMATION_DELIVERY_ENABLED")!=="true")
    return json(503,{error:"Future confirmation delivery disabled"});
  if(Deno.env.get("FUTURE_CONFIRMATION_PROVIDER")!=="postmark")
    return json(503,{error:"Transactional provider not approved or configured"});
  const token=Deno.env.get("POSTMARK_SERVER_TOKEN")||"";
  const from=Deno.env.get("FUTURE_CONFIRMATION_FROM")||"";
  const dbUrl=Deno.env.get("SUPABASE_URL")||"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(token.length<12||token==="POSTMARK_API_TEST"||
    !/^[^@\s]+@flatoutbuiltuproofing\.co\.uk$/i.test(from)||!dbUrl||!serviceKey)
    return json(503,{error:"Transactional sender is not ready"});
  const admin=createClient(dbUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:items,error:claimErr}=await admin.rpc("claim_future_contract_confirmations",{p_limit:1});
  if(claimErr)return json(503,{error:"Future confirmation queue unavailable"});
  if(!Array.isArray(items)||items.length===0)return json(200,{status:"idle",claimed:0});
  const job=items[0];
  const finish=async(outcome:"accepted"|"review",messageId:string|null,details:string|null)=>{
    const {data,error}=await admin.rpc("finish_future_contract_confirmation",{
      p_session_id:job.session_id,p_claim_token:job.claim_token,
      p_outcome:outcome,p_provider_message_id:messageId,p_details:details
    });
    return !error&&data===true;
  };
  let email;
  try{email=buildDurableEmail(job,from);}
  catch{
    const updated=await finish("review",null,"Validated order content could not be assembled");
    return json(updated?422:503,{error:"Contract details need manual review"});
  }
  try{
    const response=await fetch("https://api.postmarkapp.com/email",{
      method:"POST",
      headers:{"Accept":"application/json","Content-Type":"application/json",
        "X-Postmark-Server-Token":token},
      body:JSON.stringify(email),
      signal:AbortSignal.timeout(15000)
    });
    const reply=await response.json();
    // Postmark includes the destination in its response. A mismatch is
    // ambiguous: NEVER re-send automatically; reconcile the message manually.
    if(response.ok&&reply?.ErrorCode===0&&typeof reply?.MessageID==="string"&&reply.MessageID
       &&typeof reply?.To==="string"&&reply.To.trim().toLowerCase()===email.To.toLowerCase()){
      const updated=await finish("accepted",reply.MessageID,null);
      if(!updated)return json(503,{error:"Accepted by provider; queue requires manual reconciliation"});
      // Provider acceptance is NOT proof of recipient inbox delivery.
      return json(200,{status:"provider_accepted",delivered:false,claimed:1});
    }
    // An API rejection is not assumed safely replayable. Operator must review.
    const updated=await finish("review",null,"Provider rejected or did not confirm acceptance");
    return json(updated?502:503,{status:"review",delivered:false});
  }catch{
    // A network timeout may occur AFTER the provider accepts a message.
    // NEVER automatically retry with a fresh provider request after this.
    const updated=await finish("review",null,"Ambiguous provider outcome; do not automatically resend");
    return json(updated?502:503,{status:"review",delivered:false});
  }
});

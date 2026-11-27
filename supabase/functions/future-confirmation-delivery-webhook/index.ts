// STAGED ONLY: A candidate Postmark delivery/bounce event handler. Not deployed.
// Postmark does not currently HMAC-sign webhooks. It supports HTTP Basic auth.
// Configure Basic Auth + IP restrictions at the trusted ingress before activation.
// The handler never sends mail, changes access, or touches historical queues.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
const response=(status:number,body:Record<string,unknown>)=>
 new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",
 "cache-control":"no-store","x-content-type-options":"nosniff"}});

async function secureEqual(a:string,b:string){
 if(!a||!b)return false;
 const encoder=new TextEncoder();
 const [left,right]=await Promise.all([
   crypto.subtle.digest("SHA-256",encoder.encode(a)),
   crypto.subtle.digest("SHA-256",encoder.encode(b))
 ]);
 const l=new Uint8Array(left),r=new Uint8Array(right);
 let mismatch=a.length^b.length;
 for(let i=0;i<l.length;i++)mismatch|=l[i]^r[i];
 return mismatch===0;
}

Deno.serve(async req=>{
 if(req.method!=="POST")return response(405,{error:"Method not allowed"});
 const auth=req.headers.get("Authorization")||"";
 if(!auth.startsWith("Basic "))return response(401,{error:"Authentication required"});
 let user="",pass="";
 try{
  const decoded=atob(auth.slice(6));
  const pos=decoded.indexOf(":");
  if(pos<1)throw Error("Malformed Basic authentication");
  user=decoded.slice(0,pos);pass=decoded.slice(pos+1);
 }catch{return response(401,{error:"Authentication required"});}
 const allowedUser=Deno.env.get("FUTURE_CONFIRMATION_WEBHOOK_USER")||"";
 const allowedPass=Deno.env.get("FUTURE_CONFIRMATION_WEBHOOK_PASSWORD")||"";
 const [userOk,passwordOk]=await Promise.all([
   secureEqual(user,allowedUser),secureEqual(pass,allowedPass)]);
 if(!userOk||!passwordOk)return response(401,{error:"Authentication required"});
 if(Deno.env.get("FUTURE_CONFIRMATION_WEBHOOK_ENABLED")!=="true")
   return response(503,{error:"Delivery webhook disabled"});
 // Postmark supplies ServerID in Delivery and Bounce events. This must be set
 // to the operator-verified server ID before processing any provider callback.
 const configuredServerId=Deno.env.get("FUTURE_CONFIRMATION_POSTMARK_SERVER_ID")||"";
 const serverId=Number(configuredServerId);
 if(!/^[1-9][0-9]*$/.test(configuredServerId)||!Number.isSafeInteger(serverId))
   return response(503,{error:"Verified Postmark Server ID required"});
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const dbUrl=Deno.env.get("SUPABASE_URL")||"";
 if(!serviceKey||!dbUrl)return response(503,{error:"Delivery webhook config incomplete"});
 const raw=await req.text();
 if(raw.length>20000)return response(413,{error:"Payload too large"});
 let event;
 try{event=JSON.parse(raw);}
 catch{return response(400,{error:"Malformed event"});}
 if(!event||typeof event!=="object" ||
   !["Delivery","Bounce"].includes(event.RecordType)||
   !["one-off-course-contract-confirmation","specialist-course-contract-confirmation","fobur-owner-delivery-check","fobur-owner-sandbox-receipt"].includes(event.Tag)||
   event.MessageStream!=="outbound"||
   typeof event.MessageID!=="string"||
   event.MessageID.length<3||event.MessageID.length>255)
   return response(200,{status:"ignored"});
 if(!Number.isSafeInteger(event.ServerID)||event.ServerID!==serverId)
   return response(200,{status:"ignored",reason:"server_mismatch"});
 const recipient=event.RecordType==="Delivery"?event.Recipient:event.Email;
 const when=event.RecordType==="Delivery"?event.DeliveredAt:event.BouncedAt;
 if(typeof recipient!=="string"||typeof when!=="string"||
   !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)||
   !Number.isFinite(Date.parse(when)))
   return response(422,{error:"Invalid provider event fields"});
 const admin=createClient(dbUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 if(event.Tag==="fobur-owner-sandbox-receipt"){
   if(recipient.toLowerCase()!=="flatoutbuiltuproofing@gmail.com")return response(200,{status:"ignored"});
   const recorded=await admin.rpc("record_owner_sandbox_receipt_event",{
     p_id:event.MessageID,p_kind:event.RecordType,p_at:new Date(when).toISOString()
   });
   return recorded.data===true?response(200,{status:"recorded"}):response(503,{status:"reconciliation_pending"});
 }
 if(event.Tag==="fobur-owner-delivery-check"){
   if(recipient.toLowerCase()!=="flatoutbuiltuproofing@gmail.com")return response(200,{status:"ignored"});
   const check=await admin.rpc("postmark_owner_check_event",{p_action:event.RecordType,p_nonce:null,p_id:event.MessageID,p_at:new Date(when).toISOString()});
   return check.data===true?response(200,{status:"recorded"}):response(503,{status:"reconciliation_pending"});
 }
 const {data,error}=await admin.rpc("record_future_contract_delivery",{
   p_provider_message_id:event.MessageID,
   p_recipient:recipient,
   p_event:event.RecordType==="Delivery"?"delivered":"bounced",
   p_event_at:new Date(when).toISOString()
 });
 // A valid provider webhook without a matching accepted message should be
 // retried by the provider (race if the outbound acceptance isn't committed).
 if(error||data!==true)return response(503,{status:"reconciliation_pending"});
 return response(200,{status:"recorded"});
});

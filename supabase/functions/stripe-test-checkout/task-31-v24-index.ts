import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
const origin="https://flatoutbuiltuproofing.co.uk", course="beginner-training-course";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Vary":"Origin"};
const reply=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers});
 if(req.method!=="POST") return reply(405,{error:"Method not allowed"});
 if(req.headers.get("origin")!==origin) return reply(403,{error:"Forbidden origin"});
 // Separate fail-closed rollout flag. Not enabled in Task 30.
 if(Deno.env.get("COURSE_TEST_CHECKOUT_V2_ENABLED")!=="true") return reply(503,{error:"Sandbox checkout protection is being verified"});
 if(Deno.env.get("STRIPE_TEST_CHECKOUT_ENABLED")!=="true") return reply(503,{error:"Sandbox checkout disabled"});
 const key=Deno.env.get("STRIPE_TEST_SECRET_KEY"), url=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!key?.startsWith("sk_test_")||!url||!anon||!service) return reply(503,{error:"Sandbox configuration incomplete"});
 const bearer=req.headers.get("Authorization")||"";
 if(!bearer.startsWith("Bearer ")) return reply(401,{error:"Authentication required"});
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await auth.auth.getUser(bearer.slice(7));
 if(error||!data.user||data.user.is_anonymous) return reply(401,{error:"Authentication required"});
 const consent=await req.json().catch(()=>null);
 if(consent?.immediate_access_consent!==true||consent?.cancellation_acknowledgement!==true||consent?.terms_accepted!==true) return reply(422,{error:"Confirm the terms, immediate digital delivery and cancellation acknowledgement before checkout"});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:claim,error:claimError}=await admin.rpc("reserve_test_course_checkout",{p_user_id:data.user.id,p_course_id:course});
 if(claimError) {console.error("Checkout reservation failed");return reply(503,{error:"Checkout protection unavailable"});}
 if(claim?.result==="owned") return reply(409,{error:"You already own this course",redirect:"/members.html"});
 if(claim?.result==="session_created") {
   // Read-only recovery: retrieve the original session, never create a replacement.
   const existingId=claim.stripe_session_id;
   if(typeof existingId!=="string"||!existingId.startsWith("cs_test_")) return reply(409,{error:"Checkout needs manual reconciliation"});
   try {
     const existing=await new Stripe(key,{apiVersion:"2025-03-31.basil"}).checkout.sessions.retrieve(existingId);
     if(existing.livemode!==false||existing.mode!=="payment"||existing.client_reference_id!==data.user.id||existing.metadata?.supabase_user_id!==data.user.id||existing.metadata?.course_id!==course)
       return reply(409,{error:"Checkout ownership could not be verified"});
     if(existing.payment_status==="paid") return reply(409,{error:"Payment already completed. Check My Learning or contact support."});
     if(existing.status==="open"&&existing.payment_status==="unpaid"&&existing.url) return reply(200,{url:existing.url,recovered:true});
     return reply(409,{error:"Original checkout is no longer open. Contact support; no replacement was created."});
   }catch {return reply(503,{error:"Original checkout could not be verified. No replacement was created."});}
 }
 if(claim?.result!=="create_once") return reply(409,{error:"Checkout already in progress. Please contact support if interrupted."});
 const stripe=new Stripe(key,{apiVersion:"2025-03-31.basil"});
 try {
   const session=await stripe.checkout.sessions.create({
     mode:"payment",line_items:[{price:"price_1UaRCSKS41qhUQTKl2uSNnYN",quantity:1}],
     client_reference_id:data.user.id,
     success_url:origin+"/?checkout=test-success",cancel_url:origin+"/?checkout=test-cancel",
     metadata:{course_id:course,supabase_user_id:data.user.id,immediate_access_consent:"true",cancellation_acknowledgement:"true",terms_accepted:"true",consent_recorded_at:new Date().toISOString()}
   },{idempotencyKey:"course-test-v2-"+claim.reservation_key});
   const {data:attached,error:attachError}=await admin.rpc("attach_test_course_checkout_session",{p_user_id:data.user.id,p_course_id:course,p_reservation_key:claim.reservation_key,p_session_id:session.id});
   if(attachError||attached!==true) {console.error("Checkout session reconciliation required",session.id);return reply(503,{error:"Checkout session pending verification; no new checkout will be created"});}
   return reply(200,{url:session.url});
 }catch(e){console.error("Checkout creation uncertain; reservation retained",String(e));return reply(503,{error:"Checkout status uncertain; contact support. No automatic retry will create another session."});}
});
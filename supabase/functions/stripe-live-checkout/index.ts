// STAGED ONLY. Not deployed until owner approves the payment cutover.
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
const origin="https://flatoutbuiltuproofing.co.uk";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"};
const reply=(status:number,body:Record<string,unknown>,extra:Record<string,string>={})=>
  new Response(JSON.stringify(body),{status,headers:{...headers,...extra}});
const courseId="beginner-training-course";
const priceId="price_1UaRJvKeIprRDTKxKDawW6ZG";

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply(405,{error:"Method not allowed"});
 if(req.headers.get("origin")!==origin)return reply(403,{error:"Forbidden origin"});
 // Deliberately preserve the existing production activation policy.
 if(Deno.env.get("STRIPE_LIVE_CHECKOUT_ENABLED")!=="true")return reply(503,{error:"Live checkout not enabled"});
 const key=Deno.env.get("STRIPE_SECRET_KEY"),url=Deno.env.get("SUPABASE_URL"),
   anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!key?.startsWith("sk_live_")||!url||!anon||!service)return reply(503,{error:"Live configuration incomplete"});
 const bearer=req.headers.get("Authorization")||"";
 if(!bearer.startsWith("Bearer "))return reply(401,{error:"Authentication required"});
 const caller=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await caller.auth.getUser(bearer.slice(7));
 if(error||!data.user||data.user.is_anonymous)return reply(401,{error:"Authentication required"});
 const buyer=data.user.id;
 const consent=await req.json().catch(()=>null);
 if(consent?.immediate_access_consent!==true||consent?.cancellation_acknowledgement!==true||
    consent?.terms_accepted!==true)return reply(422,{error:"Confirm terms, immediate digital delivery and cancellation acknowledgement"});
 // All reservation RPCs are restricted to service_role and use DB advisory locks.
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const stripe=new Stripe(key,{apiVersion:"2026-11-18.endive"});
 try{
   const {data:reserved,error:reserveError}=await admin.rpc("reserve_live_course_checkout",
     {p_user_id:buyer,p_course_id:courseId});
   if(reserveError||!reserved?.result)return reply(503,{error:"Checkout reservation unavailable"});
   let step=reserved;
   if(step.result==="owned")return reply(409,{error:"You already own this course. Open My Learning."});
   if(step.result==="pending")return reply(409,{error:"Your checkout is being prepared. Try again shortly."},
     {"Retry-After":"10"});
   // A previous session cannot be recycled until Stripe confirms it is expired and unpaid.
   if(step.result==="reconcile"&&typeof step.stripe_session_id==="string"){
     const previous=await stripe.checkout.sessions.retrieve(step.stripe_session_id);
     if(previous.status==="expired"&&previous.payment_status==="unpaid"&&
        previous.client_reference_id===buyer&&previous.mode==="payment"){
       const {data:recycled,error:recycleError}=await admin.rpc("recycle_expired_live_course_checkout",
         {p_user_id:buyer,p_course_id:courseId,p_reservation_key:step.reservation_key,
          p_stripe_session_id:step.stripe_session_id});
       if(recycleError||!recycled?.result)return reply(503,{error:"Checkout recovery unavailable"});
       step=recycled;
     }else return reply(409,{error:"Previous checkout requires payment reconciliation before retrying."});
   }
   if(step.result==="open"&&typeof step.url==="string")
     return reply(200,{url:step.url,reused:true});
   if(step.result==="owned")return reply(409,{error:"Course already purchased"});
   if(step.result==="pending")return reply(409,{error:"Checkout is in progress"},{"Retry-After":"10"});
   if(step.result!=="create_once"||!step.reservation_key||!step.consent_recorded_at)
     return reply(503,{error:"Checkout pending safe reconciliation"});
   const session=await stripe.checkout.sessions.create({
     mode:"payment",
     line_items:[{price:priceId,quantity:1}],
     managed_payments:{enabled:false},
     adaptive_pricing:{enabled:false},
     automatic_tax:{enabled:false},
     shipping_address_collection:{allowed_countries:["GB"]},
     custom_text:{shipping_address:{message:"Enter your UK address to confirm eligibility. The course is delivered online."}},
     client_reference_id:buyer,
     success_url:origin+"/members.html?checkout=success",
     cancel_url:origin+"/purchase-info.html?checkout=cancel",
     metadata:{eligibility_policy:"uk-address-v1",course_id:courseId,supabase_user_id:buyer,
       immediate_access_consent:"true",cancellation_acknowledgement:"true",
       terms_accepted:"true",consent_recorded_at:step.consent_recorded_at}
   },{idempotencyKey:"fobur-live-lesson-"+step.reservation_key});
   if(!session.url||session.status!=="open"||session.payment_status!=="unpaid"||
      !session.id?.startsWith("cs_live_")||!session.expires_at)
     return reply(503,{error:"Checkout session needs manual reconciliation"});
   const {data:finalized,error:finalError}=await admin.rpc("finalize_live_course_checkout",
     {p_user_id:buyer,p_course_id:courseId,p_reservation_key:step.reservation_key,
      p_stripe_session_id:session.id,p_stripe_url:session.url,
      p_expires_at:new Date(session.expires_at*1000).toISOString()});
   if(finalError||finalized?.result!=="open")return reply(503,{error:"Checkout reservation not finalised"});
   return reply(200,{url:session.url});
 }catch(e){
   // Unknown Stripe create outcome must never trigger a new idempotency key.
   console.error("Live checkout could not be safely completed",String(e));
   return reply(503,{error:"Live checkout temporarily unavailable"});
 }
});

import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
const origin="https://flatoutbuiltuproofing.co.uk";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Vary":"Origin"};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers});
 if(req.method!=="POST") return new Response("Method not allowed",{status:405,headers});
 if(req.headers.get("origin")!==origin) return new Response("Forbidden origin",{status:403,headers});
 if(Deno.env.get("STRIPE_LIVE_CHECKOUT_ENABLED")!=="true") return new Response(JSON.stringify({error:"Live checkout not enabled"}),{status:503,headers});
 const key=Deno.env.get("STRIPE_SECRET_KEY"), url=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!key?.startsWith("sk_live_")||!url||!anon||!service) return new Response(JSON.stringify({error:"Live configuration incomplete"}),{status:503,headers});
 const bearer=req.headers.get("Authorization")||"";
 if(!bearer.startsWith("Bearer ")) return new Response("Authentication required",{status:401,headers});
 const supabase=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await supabase.auth.getUser(bearer.slice(7));
 if(error||!data.user||data.user.is_anonymous) return new Response("Authentication required",{status:401,headers});
 const consent=await req.json().catch(()=>null);
 if(consent?.immediate_access_consent!==true || consent?.cancellation_acknowledgement!==true || consent?.terms_accepted!==true) return new Response(JSON.stringify({error:"Confirm the terms, immediate digital delivery and cancellation acknowledgement before checkout"}),{status:422,headers});
 const priceId="price_1UaRJvKeIprRDTKxKDawW6ZG";
 if(!priceId?.startsWith("price_")) return new Response(JSON.stringify({error:"Live price not configured"}),{status:503,headers});
 const stripe=new Stripe(key,{apiVersion:"2026-11-18.endive"});
 const reply=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers});
 const course="beginner-training-course";
 const admin=createClient(url,service!,{auth:{persistSession:false,autoRefreshToken:false}});
 let {data:claim,error:claimError}=await admin.rpc("reserve_live_course_checkout",{p_user_id:data.user.id,p_course_id:course});
 if(claimError) return reply(503,{error:"Checkout protection unavailable"});
 if(claim?.result==="owned_or_paid") return reply(409,{error:"Course already purchased. Check My Learning or contact support."});
 if(claim?.result==="session_created"){
   try{
     const id=claim.stripe_session_id;
     if(typeof id!=="string"||!id.startsWith("cs_live_")) return reply(409,{error:"Checkout needs reconciliation"});
     const existing=await stripe.checkout.sessions.retrieve(id);
     if(!existing.livemode||existing.mode!=="payment"||existing.client_reference_id!==data.user.id||existing.metadata?.course_id!==course||existing.metadata?.supabase_user_id!==data.user.id||existing.amount_total!==999||existing.currency!=="gbp") return reply(409,{error:"Checkout ownership or price could not be verified"});
     if(existing.status==="open"&&existing.payment_status==="unpaid"&&existing.url) return reply(200,{url:existing.url,recovered:true});
     if(existing.status==="expired"&&existing.payment_status==="unpaid"&&!existing.payment_intent){
       const rotated=await admin.rpc("rotate_expired_live_checkout",{p_user_id:data.user.id,p_course_id:course,p_expired_session_id:id});
       if(rotated.error) return reply(503,{error:"Checkout recovery unavailable"});
       claim=rotated.data;
     }else return reply(409,{error:"Original checkout is no longer payable. Contact support."});
   }catch{return reply(503,{error:"Original checkout could not be verified"});}
 }
 if(claim?.result!=="create_once"||typeof claim.reservation_key!=="string") return reply(409,{error:"Checkout already in progress. Contact support if interrupted."});
 try{
 const session=await stripe.checkout.sessions.create({
 mode:"payment",
 line_items:[{price:priceId,quantity:1}],
 managed_payments:{enabled:false},
 adaptive_pricing:{enabled:false},
 automatic_tax:{enabled:false},
 // Hosted Checkout enforces the country list on its address collection field.
 shipping_address_collection:{allowed_countries:["GB"]},
 custom_text:{shipping_address:{message:"Enter your UK address to confirm eligibility. The course is delivered online."}},
 client_reference_id:data.user.id,
 success_url:origin+"/members.html?checkout=success",
 cancel_url:origin+"/purchase-info.html?checkout=cancel",
 metadata:{eligibility_policy:"uk-address-v1",course_id:"beginner-training-course",supabase_user_id:data.user.id,immediate_access_consent:"true",cancellation_acknowledgement:"true",terms_accepted:"true",checkout_reservation_key:claim.reservation_key,consent_recorded_at:new Date().toISOString()}
 },{idempotencyKey:"course-live-v2-"+claim.reservation_key});
 const {data:attached,error:attachError}=await admin.rpc("attach_live_course_checkout_session",{p_user_id:data.user.id,p_course_id:course,p_reservation_key:claim.reservation_key,p_session_id:session.id});
 if(attachError||attached!==true||!session.url) return reply(503,{error:"Checkout pending reconciliation; no replacement will be created"});
 return reply(200,{url:session.url});
 }catch(e){console.error("Live checkout error",String(e));return new Response(JSON.stringify({error:"Live checkout unavailable"}),{status:503,headers});}
});
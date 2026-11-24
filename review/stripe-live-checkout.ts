// REVIEW ONLY — not deployed; expired session rotation requires integration testing.
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
const origin="https://flatoutbuiltuproofing.co.uk";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Vary":"Origin"};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers});
 if(req.method!=="POST") return new Response("Method not allowed",{status:405,headers});
 if(req.headers.get("origin")!==origin) return new Response("Forbidden origin",{status:403,headers});
 if(Deno.env.get("STRIPE_LIVE_CHECKOUT_ENABLED")!=="true") return new Response(JSON.stringify({error:"Live checkout not enabled"}),{status:503,headers});
 const key=Deno.env.get("STRIPE_SECRET_KEY"), url=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!key?.startsWith("sk_live_")||!url||!anon) return new Response(JSON.stringify({error:"Live configuration incomplete"}),{status:503,headers});
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
 try{
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!service) return new Response(JSON.stringify({error:"Checkout protection unavailable"}),{status:503,headers});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const course="beginner-training-course", user=data.user.id;
 let {data:reservation,error:reservationError}=await admin.rpc("reserve_live_course_checkout",{p_user_id:user,p_course_id:course});
 if(reservationError||!reservation) throw new Error("Reservation unavailable");
 const reply=(error:string,status:number)=>new Response(JSON.stringify({error}),{status,headers});
 if(reservation.result==="owned_or_paid") return reply("Course already purchased or payment awaiting confirmation",409);
 if(reservation.result==="existing"){
   if(!reservation.stripe_session_id) return reply("Checkout outcome awaiting reconciliation. Do not start another payment.",409);
   const original=await stripe.checkout.sessions.retrieve(reservation.stripe_session_id);
   if(!original.livemode||original.client_reference_id!==user||original.metadata?.course_id!==course||original.metadata?.reservation_key!==reservation.reservation_key) return reply("Checkout requires owner review",409);
   if(original.status==="open"&&original.payment_status==="unpaid"&&original.url) return new Response(JSON.stringify({url:original.url}),{status:200,headers});
   // Fail closed for asynchronous or uncertain payment outcomes. Only a terminal
   // expired session with no PaymentIntent or a canceled PaymentIntent can rotate.
   if(original.status!=="expired"||original.payment_status!=="unpaid"||original.id!==reservation.stripe_session_id||original.after_expiration?.recovery?.enabled||original.recovered_from) return reply("Previous checkout requires reconciliation before another attempt",409);
   if(original.payment_intent){
     const pi=await stripe.paymentIntents.retrieve(typeof original.payment_intent==="string"?original.payment_intent:original.payment_intent.id);
     if(!pi.livemode||pi.status!=="canceled"||pi.amount_received!==0) return reply("Previous payment requires reconciliation",409);
   }
   const rotated=await admin.rpc("rotate_expired_live_course_checkout",{p_user_id:user,p_course_id:course,p_key:reservation.reservation_key,p_session:original.id});
   if(rotated.error||rotated.data?.result!=="create_once") return reply("Checkout recovery requires reconciliation or retry",409);
   reservation=rotated.data;
 }
 if(reservation.result!=="create_once"||!reservation.reservation_key) throw new Error("Unexpected reservation");
 const session=await stripe.checkout.sessions.create({
 mode:"payment",
 expires_at:Math.floor(Date.now()/1000)+3600,
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
 metadata:{reservation_key:reservation.reservation_key,eligibility_policy:"uk-address-v1",course_id:"beginner-training-course",supabase_user_id:data.user.id,immediate_access_consent:"true",cancellation_acknowledgement:"true",terms_accepted:"true",consent_recorded_at:new Date().toISOString()}
 },{idempotencyKey:"fobur-live-course-"+reservation.reservation_key});
 if(!session.livemode||!session.id.startsWith("cs_live_")||!session.url) throw new Error("Unexpected checkout result");
 const {data:attached,error:attachError}=await admin.rpc("attach_live_course_checkout",{p_user_id:user,p_course_id:course,p_key:reservation.reservation_key,p_session:session.id});
 if(attachError||attached!==true) throw new Error("Checkout attachment failed; reconciliation required");
 return new Response(JSON.stringify({url:session.url}),{status:200,headers});
 }catch(e){console.error("Live checkout error",String(e));return new Response(JSON.stringify({error:"Live checkout unavailable"}),{status:503,headers});}
});
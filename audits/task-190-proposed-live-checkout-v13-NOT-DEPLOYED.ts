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
 const stripe=new Stripe(key,{apiVersion:"2025-03-31.basil"});
 try{
 const session=await stripe.checkout.sessions.create({
 mode:"payment",line_items:[{price:priceId,quantity:1}],
 client_reference_id:data.user.id,
 success_url:origin+"/members.html?checkout=success",
 cancel_url:origin+"/purchase-info.html?checkout=cancel",
 metadata:{course_id:"beginner-training-course",supabase_user_id:data.user.id,immediate_access_consent:"true",cancellation_acknowledgement:"true",terms_accepted:"true",terms_version:"2026-11-13-draft-review-required",consent_recorded_at:new Date().toISOString()}
 });
 return new Response(JSON.stringify({url:session.url}),{status:200,headers});
 }catch(e){console.error("Live checkout error",String(e));return new Response(JSON.stringify({error:"Live checkout unavailable"}),{status:503,headers});}
});
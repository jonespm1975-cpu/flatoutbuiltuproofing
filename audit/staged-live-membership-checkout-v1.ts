import Stripe from "npm:stripe@17.7.0";
import {createClient} from "npm:@supabase/supabase-js@2.49.4";
const origin="https://flatoutbuiltuproofing.co.uk";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Vary":"Origin","Cache-Control":"no-store"};
const reply=(message:string,status:number)=>new Response(JSON.stringify({error:message}),{status,headers});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply("Method not allowed",405);
 if(req.headers.get("origin")!==origin)return reply("Forbidden origin",403);
 if(Deno.env.get("MEMBERSHIP_LIVE_CHECKOUT_ENABLED")!=="true")return reply("Membership production checkout disabled pending controlled testing",503);
 const key=Deno.env.get("STRIPE_SECRET_KEY"),url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!key?.startsWith("sk_live_")||!url||!anon||!service)return reply("Production configuration incomplete",503);
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer "))return reply("Sign in required",401);
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(auth.slice(7));
 if(error||!data.user||data.user.is_anonymous)return reply("Sign in required",401);
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:existing,error:existingError}=await userClient.from("membership_subscriptions")
   .select("stripe_subscription_id,status,current_period_end")
   .eq("user_id",data.user.id).eq("livemode",true)
   .eq("stripe_price_id","price_1UeNy2KeIprRDTKxLWoER0vk")
   .in("status",["incomplete","trialing","active","past_due","unpaid","paused"])
   .limit(1);
 if(existingError)return reply("Unable to check existing membership",503);
 if(existing?.length)return reply("A production membership already exists. Manage your existing subscription instead of starting another.",409);
 const body=await req.json().catch(()=>null);
 if(body?.terms_accepted!==true||body?.recurring_billing_consent!==true||body?.cancellation_acknowledgement!==true)return reply("Monthly billing, terms and cancellation consent required",422);
 // Transactional server-only lease stops two concurrent requests creating checkout sessions.
 
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:acquired,error:leaseError}=await admin.rpc("reserve_live_membership_checkout",{p_user_id:data.user.id});
 if(leaseError)return reply("Unable to reserve a production checkout. Try again later.",503);
 // Recover an existing reservation without generating a new Stripe idempotency key.
 const {data:reservation,error:inspectError}=await admin.rpc("inspect_live_membership_checkout",{p_user_id:data.user.id});
 if(inspectError||!reservation||typeof reservation.reservation_key!=="string"||
    !Number.isSafeInteger(Number(reservation.created_epoch)))return reply("Checkout reservation unavailable; contact support.",503);
 const reservationKey=reservation.reservation_key;
 if(typeof acquired==="string"&&acquired!==reservationKey)return reply("Checkout reservation changed; try again.",409);
 const createdEpoch=Number(reservation.created_epoch);
 const expiresAt=createdEpoch+3600;
 // Never replay a key outside this short window, or rotate a reservation without
 // authoritative Stripe reconciliation. Stripe requires expiry >=30 minutes on creation.
 if(expiresAt-Math.floor(Date.now()/1000)<1800)return reply("Checkout requires reconciliation before another attempt. Contact support.",409);
 try{
  const stripe=new Stripe(key,{apiVersion:"2025-03-31.basil"});
  const session=await stripe.checkout.sessions.create({
   mode:"subscription",shipping_address_collection:{allowed_countries:["GB"]},managed_payments:{enabled:false},expires_at:expiresAt,line_items:[{price:"price_1UeNy2KeIprRDTKxLWoER0vk",quantity:1}],
   client_reference_id:data.user.id,
   success_url:origin+"/members.html?membership=success",
   cancel_url:origin+"/members.html?membership=cancel",
   metadata:{supabase_user_id:data.user.id,membership:"monthly-learning",mode:"live",reservation_key:reservationKey},
   subscription_data:{metadata:{supabase_user_id:data.user.id,membership:"monthly-learning",mode:"live",reservation_key:reservationKey}},
  },{idempotencyKey:"fobur-live-monthly-v1-"+reservationKey});
  if(!session.url||session.status!=="open"||session.payment_status!=="unpaid"||session.mode!=="subscription"||!session.livemode||session.client_reference_id!==data.user.id||session.metadata?.reservation_key!==reservationKey)return reply("Checkout cannot be resumed; contact support.",409);
  return new Response(JSON.stringify({url:session.url,test_mode:false}),{headers});
 }catch(e){console.error("Membership production checkout failed",String(e));return reply("Production checkout unavailable",503);}
});
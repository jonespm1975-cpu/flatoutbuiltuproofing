const RELEASE_APPROVED = false;
import Stripe from "npm:stripe@17.7.0";
import {createClient} from "npm:@supabase/supabase-js@2.49.4";
const ORIGIN="https://flatoutbuiltuproofing.co.uk";
const HEADERS={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"};
const reply=(error:string,status:number)=>new Response(JSON.stringify({error}),{status,headers:HEADERS});
Deno.serve(async(req)=>{
 if(!RELEASE_APPROVED)return new Response(JSON.stringify({status:'staged_disabled'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:HEADERS});
 if(req.method!=="POST")return reply("Method not allowed",405);
 if(req.headers.get("origin")!==ORIGIN)return reply("Forbidden origin",403);
 if(Deno.env.get("MEMBERSHIP_LIVE_PORTAL_ENABLED")!=="true")return reply("Production portal disabled until testing",503);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),key=Deno.env.get("STRIPE_SECRET_KEY");
 if(!url||!anon||!key?.startsWith("sk_live_"))return reply("Production configuration unavailable",503);
 const token=req.headers.get("authorization")?.replace(/^Bearer /,"");
 if(!token)return reply("Sign in required",401);
 const client=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await client.auth.getUser(token);
 if(authError||!auth.user||auth.user.is_anonymous)return reply("Sign in required",401);
 const {data:rows,error:dbError}=await client.from("membership_subscriptions").select("stripe_customer_id,stripe_subscription_id").eq("user_id",auth.user.id).eq("livemode",true).eq("stripe_price_id","price_1UeNy2KeIprRDTKxLWoER0vk").order("updated_at",{ascending:false}).limit(1);
 if(dbError)return reply("Membership lookup unavailable",503);
 if(!rows?.length)return reply("No live membership found",404);
 try{
  const stripe=new Stripe(key,{apiVersion:"2025-03-31.basil"});
  const subscription=await stripe.subscriptions.retrieve(rows[0].stripe_subscription_id);
  const customer=typeof subscription.customer==="string"?subscription.customer:subscription.customer.id;
  if(subscription.livemode!==true||customer!==rows[0].stripe_customer_id||subscription.metadata?.supabase_user_id!==auth.user.id||subscription.items.data.length!==1||subscription.items.data[0].price.id!=="price_1UeNy2KeIprRDTKxLWoER0vk")return reply("Membership verification failed",403);
  // Dedicated live configuration verified against Stripe on 24 November 2026. The ID is not a secret.
  const configId=Deno.env.get("MEMBERSHIP_LIVE_PORTAL_CONFIGURATION")||"bpc_1UfOBAKeIprRDTKxKLJQmlQ7";
  if(!configId?.startsWith("bpc_"))return reply("Portal configuration missing",503);
  const config=await stripe.billingPortal.configurations.retrieve(configId);
  if(!config.livemode||!config.active||!config.features.subscription_cancel.enabled||config.features.subscription_cancel.mode!=="at_period_end"||config.features.subscription_update.enabled)return reply("Portal configuration not approved",503);
  if(subscription.items.data[0].price.unit_amount!==500||subscription.items.data[0].price.currency!=="gbp"||subscription.items.data[0].price.recurring?.interval!=="month"||subscription.items.data[0].price.recurring?.interval_count!==1||subscription.metadata?.mode!=="live")return reply("Membership verification failed",403);
  const session=await stripe.billingPortal.sessions.create({customer,configuration:configId,return_url:ORIGIN+"/members.html"});
  if(!session.url)return reply("Portal unavailable",503);
  return new Response(JSON.stringify({url:session.url,test_mode:false}),{status:200,headers:HEADERS});
 }catch(e){console.error("Production portal error",String(e));return reply("Portal unavailable",503);}
});
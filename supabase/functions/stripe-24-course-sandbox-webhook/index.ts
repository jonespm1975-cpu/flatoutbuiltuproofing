/**
 * NOT DEPLOYED. Proposed isolated /functions/v1/stripe-24-course-sandbox-webhook
 * Uses a separate webhook signing secret and a service-role-only atomic RPC.
 * DO NOT deploy on the live production project or set the rollout flag until
 * 24 real sandbox prices, isolated database and email/access tests pass.
 */
import Stripe from "npm:stripe@23.2.0";
import {createClient} from "npm:@supabase/supabase-js@2.49.4";
import {processSandboxWebhook} from "../../../fulfilment/sandbox-webhook-workflow.mjs";
import {makeSandboxReceiptAdapter} from "../../../fulfilment/sandbox-receipt-adapter.mjs";

const json=(status:number,code:string)=>new Response(JSON.stringify({code}),{
 status,headers:{"content-type":"application/json","cache-control":"no-store"}
});
type Row={course_id:string;title:string;stripe_price_id_test:string;
 status:string;content_status:string;checkout_enabled:boolean;};
const slugs=["built-up","tile-slate","metal-sheet","liquid-applied"];
const approved=new Set(slugs.flatMap(s=>Array.from({length:6},(_,i)=>s+"-"+String(i+1).padStart(2,"0"))));
function loadConfiguration(){
 const raw=Deno.env.get("COURSE_SANDBOX_CATALOGUE_JSON");
 if(!raw)return null;
 let rows:Row[];
 try{rows=JSON.parse(raw)}catch{return null}
 if(!Array.isArray(rows)||rows.length!==24)return null;
 const ids=new Set<string>(),prices=new Set<string>();
 const courseConfig:Record<string,unknown>={},courseTitles:Record<string,string>={};
 for(const row of rows){
  if(typeof row?.course_id!=="string"||!approved.has(row.course_id)||ids.has(row.course_id))return null;
  ids.add(row.course_id);
  if(row.status!=="published"||row.content_status!=="verified"||row.checkout_enabled!==true)return null;
  if(typeof row.title!=="string"||row.title.length<3||row.title.length>180)return null;
  if(typeof row.stripe_price_id_test!=="string"||!/^price_[A-Za-z0-9_]+$/.test(row.stripe_price_id_test)||prices.has(row.stripe_price_id_test))return null;
  prices.add(row.stripe_price_id_test);
  courseConfig[row.course_id]={status:"published",content_verified:true,checkout_enabled:true,price_id:row.stripe_price_id_test};
  courseTitles[row.course_id]=row.title;
 }
 return {courseConfig,courseTitles};
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json(405,"method_not_allowed");
 // Explicit second rollout flag; deployment alone is never activation.
 if(Deno.env.get("COURSE_24_SANDBOX_WEBHOOK_ENABLED")!=="true")return json(503,"disabled");
 const secret=Deno.env.get("COURSE_24_SANDBOX_WEBHOOK_SECRET");
 const stripeKey=Deno.env.get("COURSE_24_SANDBOX_STRIPE_KEY");
 const dbUrl=Deno.env.get("SUPABASE_URL");
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const cfg=loadConfiguration();
 if(!secret?.startsWith("whsec_")||!stripeKey?.startsWith("sk_test_")||!dbUrl||!serviceKey||!cfg)
   return json(503,"sandbox_configuration_incomplete");
 const signature=req.headers.get("stripe-signature");
 if(!signature)return json(400,"signature_required");
 let rawBody:string;
 try{rawBody=await req.text()}catch{return json(400,"invalid_body")}
 const stripe=new Stripe(stripeKey,{apiVersion:"2026-11-18.endive"});
 const admin=createClient(dbUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 // Caller must never send a price ID or course ownership assertion here.
 const persistConfirmation=makeSandboxReceiptAdapter(async(record)=>{
  const {data,error}=await admin.rpc("record_sandbox_24_course_receipt_v1",{
   p_session:record.stripe_checkout_session_id,
   p_user_id:record.user_id,
   p_course_id:record.course_id,
   p_consent_recorded_at:record.consent_recorded_at
  });
  if(error||!data)throw Error("atomic_receipt_unavailable");
  return data;
 });
 const result=await processSandboxWebhook({
  rawBody,signature,courseConfig:cfg.courseConfig,courseTitles:cfg.courseTitles,
  verifySignedEvent:(raw:string,sig:string)=>
    stripe.webhooks.constructEventAsync(raw,sig,secret,undefined,Stripe.createSubtleCryptoProvider()),
  getLineItems:async(sessionId:string)=>{
    const page=await stripe.checkout.sessions.listLineItems(sessionId,{limit:2});
    if(page.has_more||page.data.length!==1)throw Error("wrong_line_item_count");
    return page.data;
  },
  persistConfirmation
 });
 return json(result.status,result.code);
});

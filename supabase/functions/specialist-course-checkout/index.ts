import Stripe from "npm:stripe@17.7.0";
import {createClient} from "npm:@supabase/supabase-js@2.49.4";
const RELEASE_APPROVED=false; // technical review, contract and end-to-end tests required.
const PRICES:Record<string,string>={"bu-01":"price_1UgRgPKeIprRDTKxshDkW1Gq","bu-02":"price_1UgRglKeIprRDTKxaRDw63u1","bu-03":"price_1UgRgzKeIprRDTKxXqapDuD7","bu-04":"price_1UgRgxKeIprRDTKx8GbPgWBe","bu-05":"price_1UgRgyKeIprRDTKxMcqomtGv","bu-06":"price_1UgRgwKeIprRDTKxVVoA6tte","ts-01":"price_1UgRh1KeIprRDTKxTTKyFq8f","ts-02":"price_1UgRh0KeIprRDTKxsXhHRTdi","ts-03":"price_1UgRh2KeIprRDTKxffrMpPl3","ts-04":"price_1UgRh3KeIprRDTKxkdRnrzcC","ts-05":"price_1UgRh4KeIprRDTKxbBdiT3Kz","ts-06":"price_1UgRh6KeIprRDTKx1qYhoRL3","ms-01":"price_1UgRh5KeIprRDTKx1QmttvFX","ms-02":"price_1UgRh6KeIprRDTKxxfgrpGvZ","ms-03":"price_1UgRh9KeIprRDTKxB9gfy5Bd","ms-04":"price_1UgRh7KeIprRDTKxBSrB1Pk5","ms-05":"price_1UgRh8KeIprRDTKxROvZDzR6","ms-06":"price_1UgRhAKeIprRDTKxyf31y3Kd","la-01":"price_1UgRhBKeIprRDTKxSLFwxewA","la-02":"price_1UgRhDKeIprRDTKx5lxJssJA","la-03":"price_1UgRhEKeIprRDTKxNZbhbF9j","la-04":"price_1UgRhCKeIprRDTKxdcEsJD3V","la-05":"price_1UgRhFKeIprRDTKxx3T7YwOS","la-06":"price_1UgRhGKeIprRDTKxohwZYL0q"};
const ORIGIN="https://flatoutbuiltuproofing.co.uk";
const TERMS="specialist-draft-v1";
const HEADERS={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"};
const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:HEADERS});
 if(req.method!=="POST")return json(405,{error:"Method not allowed"});
 if(req.headers.get("origin")!==ORIGIN)return json(403,{error:"Forbidden origin"});
 if(!RELEASE_APPROVED||Deno.env.get("SPECIALIST_LIVE_CHECKOUT_ENABLED")!=="true")return json(503,{error:"Specialist courses are not released"});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),key=Deno.env.get("STRIPE_SECRET_KEY");
 if(!url||!anon||!service||!key?.startsWith("sk_live_"))return json(503,{error:"Configuration incomplete"});
 const token=req.headers.get("Authorization")?.replace(/^Bearer /,"");if(!token)return json(401,{error:"Sign in required"});
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:identityError}=await auth.auth.getUser(token);
 if(identityError||!identity.user||identity.user.is_anonymous)return json(401,{error:"Sign in required"});
 const body=await req.json().catch(()=>null),course=body?.course_id;
 if(typeof course!=="string"||!Object.hasOwn(PRICES,course))return json(404,{error:"Course not found"});
 if(body?.terms_version!==TERMS||body?.terms_accepted!==true||body?.immediate_access_consent!==true||body?.cancellation_acknowledgement!==true)return json(422,{error:"Explicit course consent required"});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:r,error:reserveError}=await admin.rpc("reserve_specialist_course_checkout",{p_user:identity.user.id,p_course:course});
 if(reserveError||!r||r.result!=="reserved")return json(r?.result==="owned_or_paid"?409:503,{error:r?.result==="owned_or_paid"?"Course already paid or owned":"Checkout requires review"});
 try{
 const stripe=new Stripe(key,{apiVersion:"2025-03-31.basil"});
 const p=await stripe.prices.retrieve(PRICES[course]);if(!p.active||!p.livemode||p.currency!=="gbp"||p.unit_amount!==999||p.type!=="one_time"||p.metadata?.course_id!==course)return json(503,{error:"Price unavailable"});
 const metadata={specialist_course:"true",course_id:course,supabase_user_id:identity.user.id,reservation_key:r.reservation_key,terms_version:TERMS,terms_accepted:"true",immediate_access_consent:"true",cancellation_acknowledgement:"true",consent_recorded_at:r.created_at,eligibility_policy:"uk-address-v1"};
 const session=r.stripe_session_id?await stripe.checkout.sessions.retrieve(r.stripe_session_id):await stripe.checkout.sessions.create({mode:"payment",line_items:[{price:PRICES[course],quantity:1}],shipping_address_collection:{allowed_countries:["GB"]},automatic_tax:{enabled:false},client_reference_id:identity.user.id,success_url:ORIGIN+"/specialist-learning.html?course="+course,cancel_url:ORIGIN+"/specialist-courses.html",metadata},{idempotencyKey:"specialist:"+r.reservation_key});
 if(!session.livemode||session.mode!=="payment"||session.client_reference_id!==identity.user.id||session.metadata?.course_id!==course||session.metadata?.reservation_key!==r.reservation_key||session.payment_status!=="unpaid"||session.status!=="open"||!session.url)return json(409,{error:"Previous checkout requires reconciliation"});
 const target=new URL(session.url);if(target.protocol!=="https:"||target.hostname!=="checkout.stripe.com")return json(503,{error:"Checkout unavailable"});
 const {data:attached,error:attachError}=await admin.rpc("attach_specialist_course_checkout",{p_user:identity.user.id,p_course:course,p_key:r.reservation_key,p_session:session.id});
 if(attachError||attached!==true)return json(503,{error:"Checkout reservation reconciliation required"});
 return json(200,{url:session.url,test_mode:false});
 }catch{return json(503,{error:"Checkout unavailable"})}
});
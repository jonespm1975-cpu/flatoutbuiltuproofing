// Isolated Stripe sandbox verification. Never grants production access or sends email.
import Stripe from "npm:stripe@17.7.0";
import {createClient} from "npm:@supabase/supabase-js@2.49.4";
const PRICES:Record<string,string>={"bu-01":"price_1UgUjJ3eiZFnd5l0cE2PPZNM","bu-02":"price_1UgUjR3eiZFnd5l0h5GTxICs","bu-03":"price_1UgUjS3eiZFnd5l0Mdw7nh1m","bu-04":"price_1UgUjU3eiZFnd5l0T1gBMEOS","bu-05":"price_1UgUjW3eiZFnd5l0bpAyARi5","bu-06":"price_1UgUjX3eiZFnd5l0Q0XTeg8C","la-01":"price_1UgUju3eiZFnd5l0989tyQHT","la-02":"price_1UgUk43eiZFnd5l0RaHcz1MV","la-03":"price_1UgUk53eiZFnd5l0NGdD5gkG","la-04":"price_1UgUk73eiZFnd5l0fao8ENqK","la-05":"price_1UgUk83eiZFnd5l07lxVKcPA","la-06":"price_1UgUkA3eiZFnd5l0r1N6OJkp","ms-01":"price_1UgUjj3eiZFnd5l0pPXpDTJA","ms-02":"price_1UgUjl3eiZFnd5l0W0rfJZab","ms-03":"price_1UgUjn3eiZFnd5l0fPKr7Lux","ms-04":"price_1UgUjo3eiZFnd5l0Y95xaNzj","ms-05":"price_1UgUjq3eiZFnd5l0Oqoq6dCL","ms-06":"price_1UgUjs3eiZFnd5l0E3BeJZSe","ts-01":"price_1UgUjZ3eiZFnd5l0g1dXmLJ6","ts-02":"price_1UgUjb3eiZFnd5l0rmn5O330","ts-03":"price_1UgUjc3eiZFnd5l0bVIxp6LZ","ts-04":"price_1UgUje3eiZFnd5l0HdigXuNT","ts-05":"price_1UgUjg3eiZFnd5l0TbAD5DmP","ts-06":"price_1UgUji3eiZFnd5l0y2LV8Zzf"};
const TERMS="specialist-2026-11-27-v1";
const verifier=new Stripe("unused_for_webhook_verification",{apiVersion:"2025-03-31.basil"});
const result=(status:number,state:string)=>Response.json({state},{status,headers:{"Cache-Control":"no-store"}});
Deno.serve(async req=>{
 if(req.method!=="POST")return result(405,"post_required");
 const sig=req.headers.get("stripe-signature");
 if(!sig)return result(400,"missing_signature");
 const secret=Deno.env.get("SPECIALIST_SANDBOX_WEBHOOK_SECRET");
 if(!secret?.startsWith("whsec_"))return result(503,"sandbox_signing_secret_missing");
 let event:Stripe.Event;
 try{event=await verifier.webhooks.constructEventAsync(await req.text(),sig,secret,undefined,Stripe.createSubtleCryptoProvider());}catch{return result(400,"invalid_signature");}
 if(event.livemode)return result(400,"live_event_rejected");
 if(!["checkout.session.completed","checkout.session.async_payment_succeeded","checkout.session.async_payment_failed","checkout.session.expired"].includes(event.type))return result(200,"ignored");
 const notice=event.data.object as Stripe.Checkout.Session;
 if(notice.metadata?.specialist_qa!=="true")return result(200,"unrelated_event");
 if(!notice.id.startsWith("cs_test_"))return result(400,"not_sandbox");
 if(event.type==="checkout.session.async_payment_failed"||event.type==="checkout.session.expired")return result(200,"no_fulfilment");
 const key=Deno.env.get("SPECIALIST_SANDBOX_STRIPE_KEY");
 if(!key||!(/^[sr]k_test_/.test(key)))return result(503,"sandbox_api_key_missing");
 try{
  const stripe=new Stripe(key,{apiVersion:"2025-03-31.basil"});
  const s=await stripe.checkout.sessions.retrieve(notice.id);
  const m=s.metadata||{},course=m.course_id;
  if(s.livemode||s.mode!=="payment"||s.payment_link||m.specialist_qa!=="true"||!course||!Object.hasOwn(PRICES,course)||m.terms_version!==TERMS||m.terms_accepted!=="true"||m.immediate_access_consent!=="true"||m.cancellation_acknowledgement!=="true"||m.eligibility_policy!=="uk-address-v1"||!Number.isFinite(Date.parse(m.consent_recorded_at||""))||s.amount_total!==999||s.currency!=="gbp")return result(422,"contract_or_payment_mismatch");
  if(s.payment_status!=="paid"||s.status!=="complete")return result(200,"not_paid");
  const country=(s as any).collected_information?.shipping_details?.address?.country??(s as any).shipping_details?.address?.country;
  if(country!=="GB")return result(422,"uk_eligibility_missing");
  const lines=await stripe.checkout.sessions.listLineItems(s.id,{limit:2});
  if(lines.has_more||lines.data.length!==1||lines.data[0].quantity!==1||lines.data[0].price?.id!==PRICES[course])return result(422,"price_mismatch");
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
  const r=await admin.rpc("record_specialist_sandbox_payment",{p_session:s.id,p_event:event.id,p_course:course,p_price:PRICES[course],p_version:TERMS,p_consent:m.consent_recorded_at});
  if(r.error||r.data!==true)return result(503,"qa_record_failed");
  return result(200,"sandbox_payment_verified_no_live_access_or_email");
 }catch{return result(503,"sandbox_verification_failed");}
});

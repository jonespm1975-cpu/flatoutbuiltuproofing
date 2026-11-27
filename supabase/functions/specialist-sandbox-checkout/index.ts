// Owner-only sandbox checkout. Test consent is simulated, not a binding customer contract.
import Stripe from "npm:stripe@17.7.0";
async function digestHex(value:string){
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
}

async function validWorkerKey(presented:string){
  if(!presented || presented.length>512)return false;
  const stored=Deno.env.get("FUTURE_CONFIRMATION_WORKER_KEY_SHA256");
  const legacy=Deno.env.get("FUTURE_CONFIRMATION_WORKER_KEY");
  const expected=stored || (legacy && await digestHex(legacy));
  if(!expected || !/^[0-9a-f]{64}$/.test(expected))return false;
  const actual=await digestHex(presented);
  let mismatch=0;
  for(let i=0;i<64;i++)mismatch|=actual.charCodeAt(i)^expected.charCodeAt(i);
  return mismatch===0;
}


const PRICES:Record<string,string>={"bu-01":"price_1UgUjJ3eiZFnd5l0cE2PPZNM","bu-02":"price_1UgUjR3eiZFnd5l0h5GTxICs","bu-03":"price_1UgUjS3eiZFnd5l0Mdw7nh1m","bu-04":"price_1UgUjU3eiZFnd5l0T1gBMEOS","bu-05":"price_1UgUjW3eiZFnd5l0bpAyARi5","bu-06":"price_1UgUjX3eiZFnd5l0Q0XTeg8C","la-01":"price_1UgUju3eiZFnd5l0989tyQHT","la-02":"price_1UgUk43eiZFnd5l0RaHcz1MV","la-03":"price_1UgUk53eiZFnd5l0NGdD5gkG","la-04":"price_1UgUk73eiZFnd5l0fao8ENqK","la-05":"price_1UgUk83eiZFnd5l07lxVKcPA","la-06":"price_1UgUkA3eiZFnd5l0r1N6OJkp","ms-01":"price_1UgUjj3eiZFnd5l0pPXpDTJA","ms-02":"price_1UgUjl3eiZFnd5l0W0rfJZab","ms-03":"price_1UgUjn3eiZFnd5l0fPKr7Lux","ms-04":"price_1UgUjo3eiZFnd5l0Y95xaNzj","ms-05":"price_1UgUjq3eiZFnd5l0Oqoq6dCL","ms-06":"price_1UgUjs3eiZFnd5l0E3BeJZSe","ts-01":"price_1UgUjZ3eiZFnd5l0g1dXmLJ6","ts-02":"price_1UgUjb3eiZFnd5l0rmn5O330","ts-03":"price_1UgUjc3eiZFnd5l0bVIxp6LZ","ts-04":"price_1UgUje3eiZFnd5l0HdigXuNT","ts-05":"price_1UgUjg3eiZFnd5l0TbAD5DmP","ts-06":"price_1UgUji3eiZFnd5l0y2LV8Zzf"};
const TERMS="specialist-2026-11-27-v1";
const ORIGIN="https://flatoutbuiltuproofing.co.uk";
const reply=(status:number,body:unknown)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
Deno.serve(async req=>{
 if(req.method!=="POST"||!await validWorkerKey(req.headers.get("x-fobur-worker-key")||""))return reply(401,{state:"unauthorized"});
 const key=Deno.env.get("SPECIALIST_SANDBOX_STRIPE_KEY")||"";
 if(!/^[sr]k_test_/.test(key))return reply(503,{state:"sandbox_key_missing_or_wrong_mode"});
 const body=await req.json().catch(()=>null),course=body?.course_id,run=body?.qa_run,consent=body?.fixture_consent_at;
 if(typeof course!=="string"||!Object.hasOwn(PRICES,course)||typeof run!=="string"||!/^qa-[a-z0-9-]{8,60}$/.test(run)||!Number.isFinite(Date.parse(consent))||Date.parse(consent)>Date.now()||body?.simulate_consent!==true)return reply(422,{state:"invalid_fixture"});
 try{
  const stripe=new Stripe(key,{apiVersion:"2025-03-31.basil"});
  const p=await stripe.prices.retrieve(PRICES[course]);
  if(p.livemode||!p.active||p.unit_amount!==999||p.currency!=="gbp"||p.type!=="one_time"||p.metadata?.course_id!==course||p.metadata?.environment!=="sandbox"||p.metadata?.terms_version!==TERMS)return reply(503,{state:"sandbox_price_mismatch"});
  const metadata={specialist_qa:"true",course_id:course,qa_run:run,terms_version:TERMS,terms_accepted:"true",immediate_access_consent:"true",cancellation_acknowledgement:"true",consent_recorded_at:consent,eligibility_policy:"uk-address-v1",consent_fixture:"simulated_not_customer_consent"};
  const session=await stripe.checkout.sessions.create({mode:"payment",line_items:[{price:p.id,quantity:1}],shipping_address_collection:{allowed_countries:["GB"]},automatic_tax:{enabled:false},adaptive_pricing:{enabled:false},locale:"en-GB",success_url:ORIGIN+"/specialist-courses.html?qa=complete",cancel_url:ORIGIN+"/specialist-courses.html?qa=cancelled",metadata},{idempotencyKey:"specialist-sandbox:"+run+":"+course});
  if(session.livemode||!session.id.startsWith("cs_test_")||session.mode!=="payment"||session.amount_total!==999||session.currency!=="gbp"||session.status!=="open"||session.payment_status!=="unpaid"||!session.url)return reply(409,{state:"session_requires_review"});
  const u=new URL(session.url);if(u.protocol!=="https:"||u.hostname!=="checkout.stripe.com")return reply(503,{state:"invalid_checkout_host"});
  return reply(200,{state:"sandbox_checkout_ready",course_id:course,session_id:session.id,url:session.url,expires_at:session.expires_at,test_mode:true,amount_pence:999});
 }catch{return reply(503,{state:"sandbox_checkout_failed"});}
});
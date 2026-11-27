import {readSpecialistPaymentRisk} from "../_shared/specialist-payment-risk.ts";
import Stripe from "npm:stripe@17.7.0";
import {createClient} from "npm:@supabase/supabase-js@2.49.4";
const RELEASE_APPROVED=false; // Do not enable until independent technical review and signed sandbox tests pass.
const PRICES:Record<string,string>={"bu-01":"price_1UgRgPKeIprRDTKxshDkW1Gq","bu-02":"price_1UgRglKeIprRDTKxaRDw63u1","bu-03":"price_1UgRgzKeIprRDTKxXqapDuD7","bu-04":"price_1UgRgxKeIprRDTKx8GbPgWBe","bu-05":"price_1UgRgyKeIprRDTKxMcqomtGv","bu-06":"price_1UgRgwKeIprRDTKxVVoA6tte","ts-01":"price_1UgRh1KeIprRDTKxTTKyFq8f","ts-02":"price_1UgRh0KeIprRDTKxsXhHRTdi","ts-03":"price_1UgRh2KeIprRDTKxffrMpPl3","ts-04":"price_1UgRh3KeIprRDTKxkdRnrzcC","ts-05":"price_1UgRh4KeIprRDTKxbBdiT3Kz","ts-06":"price_1UgRh6KeIprRDTKx1qYhoRL3","ms-01":"price_1UgRh5KeIprRDTKx1QmttvFX","ms-02":"price_1UgRh6KeIprRDTKxxfgrpGvZ","ms-03":"price_1UgRh9KeIprRDTKxB9gfy5Bd","ms-04":"price_1UgRh7KeIprRDTKxBSrB1Pk5","ms-05":"price_1UgRh8KeIprRDTKxROvZDzR6","ms-06":"price_1UgRhAKeIprRDTKxyf31y3Kd","la-01":"price_1UgRhBKeIprRDTKxSLFwxewA","la-02":"price_1UgRhDKeIprRDTKx5lxJssJA","la-03":"price_1UgRhEKeIprRDTKxNZbhbF9j","la-04":"price_1UgRhCKeIprRDTKxdcEsJD3V","la-05":"price_1UgRhFKeIprRDTKxx3T7YwOS","la-06":"price_1UgRhGKeIprRDTKxohwZYL0q"};
const TERMS="specialist-2026-11-27-v2";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const verifier=new Stripe("unused_for_webhook_verification",{apiVersion:"2025-03-31.basil"});
Deno.serve(async req=>{
 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 const signature=req.headers.get("stripe-signature"),secret=Deno.env.get("SPECIALIST_COURSE_WEBHOOK_SECRET");
 if(!signature||!secret)return new Response("Missing signature or configuration",{status:400});
 let event:Stripe.Event;try{event=await verifier.webhooks.constructEventAsync(await req.text(),signature,secret,undefined,Stripe.createSubtleCryptoProvider())}catch{return new Response("Invalid signature",{status:400})}
 if(["checkout.session.async_payment_failed","checkout.session.expired"].includes(event.type))return new Response("No entitlement granted",{status:200});
 if(!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type))return new Response("Ignored",{status:200});
 const notice=event.data.object as Stripe.Checkout.Session;
 if(notice.metadata?.specialist_course!=="true")return new Response("Ignored",{status:200});
 if(!RELEASE_APPROVED||Deno.env.get("SPECIALIST_LIVE_FULFILMENT_ENABLED")!=="true")return new Response("Specialist fulfilment not released",{status:503});
 if(!event.livemode||!notice.id.startsWith("cs_live_"))return new Response("Wrong payment mode",{status:400});
 const key=Deno.env.get("STRIPE_SECRET_KEY"),url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!key?.startsWith("sk_live_")||!url||!service)return new Response("Configuration incomplete",{status:503});
 try{
 const stripe=new Stripe(key,{apiVersion:"2025-03-31.basil"});
 const session=await stripe.checkout.sessions.retrieve(notice.id),metadata=session.metadata||{},course=metadata.course_id,user=session.client_reference_id,reservation=metadata.reservation_key;
 if(!session.livemode||session.mode!=="payment"||session.payment_link||session.currency!=="gbp"||session.amount_total!==999||session.payment_status!=="paid"||session.status!=="complete"||!course||!Object.hasOwn(PRICES,course)||!user||!UUID.test(user)||metadata.supabase_user_id!==user||!reservation||!UUID.test(reservation)||metadata.specialist_course!=="true"||metadata.terms_version!==TERMS||metadata.terms_accepted!=="true"||metadata.immediate_access_consent!=="true"||metadata.cancellation_acknowledgement!=="true"||!metadata.consent_recorded_at||metadata.eligibility_policy!=="uk-address-v1")return new Response("Payment or consent mismatch",{status:422});
 const address=(session as any).collected_information?.shipping_details?.address?.country??(session as any).shipping_details?.address?.country;
 if(address!=="GB")return new Response("UK eligibility not verified",{status:422});
 const li=await stripe.checkout.sessions.listLineItems(session.id,{limit:2});
 if(li.has_more||li.data.length!==1||li.data[0].quantity!==1||li.data[0].price?.id!==PRICES[course])return new Response("Course price mismatch",{status:422});
 const risk=await readSpecialistPaymentRisk(stripe,session,true);
 if(!["active","partial_refund_active"].includes(risk))return new Response("Payment risk requires reconciliation",{status:503});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:userError}=await admin.auth.admin.getUserById(user);if(userError||!identity.user||identity.user.is_anonymous)return new Response("Unknown customer",{status:422});
 const {data:applied,error}=await admin.rpc("apply_specialist_course_payment",{p_user:user,p_course:course,p_key:reservation,p_session:session.id,p_consent:metadata.consent_recorded_at});
 if(error||applied!==true)return new Response("Payment requires reconciliation",{status:503});
 return new Response("Verified specialist course payment and entitlement recorded",{status:200});
 }catch{return new Response("Temporary failure",{status:503})}
});
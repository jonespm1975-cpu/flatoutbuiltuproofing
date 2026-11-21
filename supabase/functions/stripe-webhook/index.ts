import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
const verifier = new Stripe("unused_for_webhook_verification", { apiVersion: "2024-12-18.acacia" });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", {status:405});
  const signature=req.headers.get("stripe-signature");
  const signingSecret=Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !signingSecret) return new Response("Webhook configuration/signature missing",{status:400});
  let event;
  try {
    event=await verifier.webhooks.constructEventAsync(await req.text(),signature,signingSecret,undefined,Stripe.createSubtleCryptoProvider());
  } catch { return new Response("Invalid signature",{status:400}); }
  if (!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)) return new Response("Ignored",{status:200});
  const session=event.data.object;
  if (session.payment_status!=="paid") return new Response("Not paid",{status:200});
  // Explicit activation requires an operator-configured flag; never enabled by deployment alone.
  if (Deno.env.get("COURSE_UNLOCK_ENABLED")!=="true") {
    console.warn("Course unlock disabled; payment event not acknowledged for retry",event.id);
    return new Response("Unlocking not enabled",{status:503});
  }
  const stripeKey=Deno.env.get("STRIPE_SECRET_KEY");
  const url=Deno.env.get("SUPABASE_URL");
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const allowedPrice=Deno.env.get("STRIPE_LESSON_PRICE_ID");
  const lessonId=Deno.env.get("STRIPE_LESSON_COURSE_ID");
  const expectedLink=Deno.env.get("STRIPE_PAYMENT_LINK_ID");
  const livePrice="price_1UaRJvKeIprRDTKxKDawW6ZG";
  if (![stripeKey,url,serviceKey,lessonId].every(Boolean)) return new Response("Configuration incomplete",{status:503});
  const userId=session.client_reference_id;
  if (!userId || !uuid.test(userId)) return new Response("Customer mapping missing",{status:422});
  if (event.livemode!==true || session.mode!=="payment" || session.currency!=="gbp" || session.amount_total!==999 || session.metadata?.course_id!==lessonId || session.metadata?.supabase_user_id!==userId || session.metadata?.immediate_access_consent!=="true" || session.metadata?.cancellation_acknowledgement!=="true" || session.metadata?.terms_accepted!=="true" || !session.metadata?.consent_recorded_at || session.payment_link) return new Response("Checkout mismatch",{status:422});
  const addressCountry = session.collected_information?.shipping_details?.address?.country
    ?? session.shipping_details?.address?.country;
  if (session.metadata?.eligibility_policy !== "uk-address-v1" || addressCountry !== "GB") {
    console.error("Course order requires UK eligibility review", event.id);
    return new Response("UK checkout eligibility not verified", { status: 422 });
  }
  try {
    const stripe=new Stripe(stripeKey!,{apiVersion:"2024-12-18.acacia"});
    const lineItems=await stripe.checkout.sessions.listLineItems(session.id,{limit:20});
    if (lineItems.has_more || lineItems.data.length!==1 || lineItems.data[0].price?.id!==livePrice || lineItems.data[0].quantity!==1) return new Response("Price mismatch",{status:422});
    const admin=createClient(url!,serviceKey!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userResult,error:userError}=await admin.auth.admin.getUserById(userId);
    if (userError || !userResult.user) return new Response("Unknown customer",{status:422});
    const {error:confirmationError}=await admin.from("purchase_confirmations").upsert({stripe_checkout_session_id:session.id,user_id:userId,course_id:lessonId!,paid_amount_pence:session.amount_total,currency:"gbp",consent_recorded_at:session.metadata.consent_recorded_at,terms_version:"2026-11-21-course-v1"},{onConflict:"stripe_checkout_session_id",ignoreDuplicates:true});
    if(confirmationError){console.error("Confirmation record failed",confirmationError.code);return new Response("Confirmation recording failed",{status:503});}
    // The purchase_confirmations INSERT trigger queues a live email independently.
    // The email finalizer grants access after provider acceptance in the same database transaction.
    // The separately authenticated live-purchase-email-delivery-worker processes the outbox.
    return new Response("Payment recorded; confirmation queued",{status:200});
  } catch(e) {console.error("Grant processing failed",String(e));return new Response("Temporary failure",{status:503});}
});

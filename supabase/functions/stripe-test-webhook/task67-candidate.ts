import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
const verifier = new Stripe("unused_for_webhook_verification", { apiVersion: "2024-12-18.acacia" });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", {status:405});
  const signature=req.headers.get("stripe-signature");
  const signingSecret=Deno.env.get("STRIPE_TEST_WEBHOOK_SECRET");
  if (!signature || !signingSecret) return new Response("Webhook configuration/signature missing",{status:400});
  let event;
  try {
    event=await verifier.webhooks.constructEventAsync(await req.text(),signature,signingSecret,undefined,Stripe.createSubtleCryptoProvider());
  } catch { return new Response("Invalid signature",{status:400}); }
  if (!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)) return new Response("Ignored",{status:200});
  const session=event.data.object;
  // Stripe routes all checkout.session.completed events to this endpoint, including
  // subscriptions that belong to the independently authenticated membership pipeline.
  if (event.livemode!==false) return new Response("Live events prohibited",{status:400});
  if (session.mode==="subscription") {
    console.info("Ignored signed sandbox membership Checkout event in course webhook",event.id);
    return new Response("Subscription checkout handled by membership webhook",{status:200});
  }
  if (session.payment_status!=="paid") return new Response("Not paid",{status:200});
  // Explicit activation requires an operator-configured flag; never enabled by deployment alone.
  if (Deno.env.get("STRIPE_TEST_UNLOCK_ENABLED")!=="true") {
    console.warn("Course unlock disabled; payment event not acknowledged for retry",event.id);
    return new Response("Unlocking not enabled",{status:503});
  }
  const stripeKey=Deno.env.get("STRIPE_TEST_SECRET_KEY");
  const url=Deno.env.get("SUPABASE_URL");
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const allowedPrice="price_1UaRCSKS41qhUQTKl2uSNnYN";
  const lessonId="beginner-training-course";
  
  if (![stripeKey,url,serviceKey,allowedPrice,lessonId].every(Boolean)) return new Response("Configuration incomplete",{status:503});
  const userId=session.client_reference_id;
  if (!userId || !uuid.test(userId)) return new Response("Customer mapping missing",{status:422});
  if (session.mode!=="payment" || session.currency!=="gbp" || session.amount_subtotal!==999 || session.amount_total<999 || event.livemode!==false || session.metadata?.supabase_user_id!==userId || session.metadata?.course_id!==lessonId || session.metadata?.immediate_access_consent!=="true" || session.metadata?.cancellation_acknowledgement!=="true" || session.metadata?.terms_accepted!=="true" || !session.metadata?.consent_recorded_at) return new Response("Checkout mismatch",{status:422});
  try {
    const stripe=new Stripe(stripeKey!,{apiVersion:"2024-12-18.acacia"});
    const lineItems=await stripe.checkout.sessions.listLineItems(session.id,{limit:20});
    if (lineItems.has_more || lineItems.data.length!==1 || lineItems.data[0].price?.id!==allowedPrice || lineItems.data[0].quantity!==1) return new Response("Price mismatch",{status:422});
    const admin=createClient(url!,serviceKey!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userResult,error:userError}=await admin.auth.admin.getUserById(userId);
    if (userError || !userResult.user) return new Response("Unknown customer",{status:422});
    const {error}=await admin.from("course_access").upsert({
      user_id:userId,course_id:lessonId!,stripe_checkout_session_id:session.id
    },{onConflict:"user_id,course_id",ignoreDuplicates:true});
    if (error) {console.error("Grant failed",error.code);return new Response("Grant failed",{status:503});}
    // Reconcile only an already-matched sandbox reservation. Historical sessions have no
    // reservation; false is expected and does not affect existing entitlements.
    const {error:reservationError}=await admin.rpc("mark_test_course_checkout_fulfilled",{
      p_user_id:userId,p_course_id:lessonId,p_session_id:session.id
    });
    if(reservationError) console.error("Sandbox reservation reconciliation pending",reservationError.code);
    // Sandbox-only email and receipt. All records use genuine cs_test_ session IDs.
    // Never send a live receipt or imply a real-money charge.
    const {error:confirmationError}=await admin.from("purchase_confirmations").upsert({
      stripe_checkout_session_id:session.id,user_id:userId,course_id:lessonId,
      paid_amount_pence:session.amount_total,currency:"gbp",
      consent_recorded_at:session.metadata.consent_recorded_at,
      terms_version:"sandbox-test"
    },{onConflict:"stripe_checkout_session_id",ignoreDuplicates:true});
    if(confirmationError){console.error("Sandbox receipt insert failed",confirmationError.code);return new Response("Receipt pending retry",{status:503});}
    // Task 67: sending is fail-closed, and the claim RPC is the sole send gate.
    // The queue must exist and be due; never fall back to a direct send.
    if (Deno.env.get("SANDBOX_COURSE_EMAIL_SEND_ENABLED") !== "true") {
      return new Response("Sandbox access granted; email sending disabled", {status:200});
    }
    const resendKey=Deno.env.get("RESEND_API_KEY");
    const fromAddress=Deno.env.get("PURCHASE_CONFIRMATION_FROM");
    const customerEmail=userResult.user.email;
    if(!resendKey||!fromAddress||!customerEmail) {
      console.error("Sandbox email configuration incomplete");
      return new Response("Sandbox access granted; email pending", {status:200});
    }
    const {data:claims,error:claimError}=await admin.rpc("claim_test_course_confirmation_email",{p_session:session.id});
    if(claimError) {
      console.error("Sandbox atomic claim failed",claimError.code);
      return new Response("Sandbox access granted; email claim pending retry",{status:200});
    }
    const claim=claims?.[0];
    if(!claim?.claim_token) {
      return new Response("Sandbox access granted; email already handled, leased, or not due",{status:200});
    }
    const finish=async (accepted:boolean,providerId:string|null,reason:string|null)=>{
      const {data,error}=await admin.rpc("finish_test_course_confirmation_email",{
        p_session:session.id,p_token:claim.claim_token,p_accepted:accepted,
        p_provider_id:providerId,p_error:reason
      });
      if(error||data!==true)console.error("Sandbox email finish failed",error?.code??"stale_or_expired_lease");
      return !error&&data===true;
    };
    const body=[
      "TEST ONLY — Flat Out Built-Up Roofing sandbox purchase confirmation",
      "This is a Stripe TEST MODE purchase. No real payment was taken.",
      "Course: Beginner Training Course",
      "Simulated checkout total: £9.99 (TEST ONLY)",
      "Stripe test session: "+session.id,
      "Test account: "+customerEmail,
      "Test access: https://flatoutbuiltuproofing.co.uk/members.html",
      "Digital-delivery consent recorded: "+session.metadata.consent_recorded_at,
      "Cancellation acknowledgement: confirmed in sandbox checkout",
      "Terms: https://flatoutbuiltuproofing.co.uk/terms.html",
      "Cancellation information: https://flatoutbuiltuproofing.co.uk/refunds.html",
      "This email is a technical test, not a tax invoice or live purchase receipt."
    ].join("\\n");
    try {
      const sent=await fetch("https://api.resend.com/emails",{
        method:"POST",
        headers:{"Authorization":"Bearer "+resendKey,"Content-Type":"application/json",
          "Idempotency-Key":"sandbox-course-confirmation-"+session.id},
        body:JSON.stringify({from:fromAddress,to:[customerEmail],
          subject:"[TEST ONLY] Flat Out Built-Up Roofing sandbox course confirmation",text:body})
      });
      if(!sent.ok) {
        const failure=await sent.json().catch(()=>({}));
        const reason="provider_http_"+sent.status+":"+(typeof failure?.name==="string"?failure.name:"unknown");
        await finish(false,null,reason);
        return new Response("Sandbox access granted; confirmation retry pending",{status:200});
      }
      const payload=await sent.json().catch(()=>({}));
      if(typeof payload?.id!=="string"||!payload.id) {
        // Provider may have accepted the request: do not release the lease for immediate retry.
        console.error("Ambiguous provider acceptance; manual reconciliation required");
        return new Response("Sandbox access granted; email reconciliation pending",{status:200});
      }
      const finished=await finish(true,payload.id,null);
      return new Response(finished?"Sandbox access granted; email accepted":"Sandbox access granted; email reconciliation pending",{status:200});
    } catch(e) {
      // Timeout/transport errors are ambiguous: retain lease and provider idempotency key.
      console.error("Ambiguous sandbox email transport failure; reconcile before retry",String(e));
      return new Response("Sandbox access granted; email reconciliation pending",{status:200});
    }
    return new Response("Sandbox access granted and test confirmation processed",{status:200});
  } catch(e) {console.error("Grant processing failed",String(e));return new Response("Temporary failure",{status:503});}
});
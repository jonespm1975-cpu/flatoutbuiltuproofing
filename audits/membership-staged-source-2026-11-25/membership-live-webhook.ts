// Staging interlock: no payment, fulfilment or portal operations until release tests pass.
const RELEASE_APPROVED = false;
import Stripe from "npm:stripe@17.7.0";
import {createClient} from "npm:@supabase/supabase-js@2.49.4";
const verify=new Stripe("webhook-verifier",{apiVersion:"2025-03-31.basil"});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRICE="price_1UeNy2KeIprRDTKxLWoER0vk";
const accepted=new Set(["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted","invoice.paid","invoice.payment_failed"]);
const allowedStatuses=new Set(["incomplete","incomplete_expired","trialing","active","past_due","canceled","unpaid","paused"]);
Deno.serve(async(req)=>{

 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 const signature=req.headers.get("stripe-signature"),secret=Deno.env.get("MEMBERSHIP_LIVE_WEBHOOK_SECRET");
 if(!signature||!secret)return new Response("Signing secret or signature missing",{status:503});
 let event:Stripe.Event;
 try{event=await verify.webhooks.constructEventAsync(await req.text(),signature,secret,undefined,Stripe.createSubtleCryptoProvider());}
 catch{return new Response("Invalid signature",{status:400});}
 if(!RELEASE_APPROVED)return new Response(JSON.stringify({status:'staged_disabled'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(event.livemode!==true)return new Response("Test events prohibited",{status:400});
 if(!accepted.has(event.type))return new Response("Ignored",{status:200});
 if(Deno.env.get("MEMBERSHIP_LIVE_FULFILMENT_ENABLED")!=="true")return new Response("Production fulfilment disabled",{status:503});
 const key=Deno.env.get("STRIPE_SECRET_KEY"),url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!key?.startsWith("sk_live_")||!url||!service)return new Response("Configuration incomplete",{status:503});
 try{
  const stripe=new Stripe(key,{apiVersion:"2025-03-31.basil"});
  const obj=event.data.object as unknown as Record<string,unknown>;
  let subscriptionId:string|undefined;
  if(event.type.startsWith("customer.subscription."))subscriptionId=typeof obj.id==="string"?obj.id:undefined;
  else { const parent=obj.parent as Record<string,unknown>|undefined; const details=parent?.subscription_details as Record<string,unknown>|undefined; subscriptionId=typeof obj.subscription==="string"?obj.subscription:typeof details?.subscription==="string"?details.subscription:undefined; }
  if(!subscriptionId?.startsWith("sub_"))return new Response("No subscription ID; no access granted",{status:200});
  // Always retrieve Stripe's current canonical state; do not trust unverified client metadata or old event snapshots.
  const subscription=await stripe.subscriptions.retrieve(subscriptionId);
  if(subscription.livemode!==true)return new Response("Wrong Stripe mode",{status:422});
  const items=subscription.items.data;
  if(items.length!==1||items[0].price.id!==PRICE||items[0].quantity!==1||items[0].price.unit_amount!==500||items[0].price.currency!=="gbp"||items[0].price.recurring?.interval!=="month"||items[0].price.recurring?.interval_count!==1)return new Response("Subscription price mismatch",{status:422});
  const userId=subscription.metadata?.supabase_user_id;
  if(!userId||!UUID.test(userId)||subscription.metadata?.membership!=="monthly-learning"||subscription.metadata?.mode!=="live"||!UUID.test(subscription.metadata?.reservation_key||""))return new Response("User mapping invalid",{status:422});
  const customer=typeof subscription.customer==="string"?subscription.customer:subscription.customer?.id;
  if(!customer)return new Response("Customer missing",{status:422});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:user,error:userError}=await admin.auth.admin.getUserById(userId);
  if(userError||!user.user)return new Response("User missing",{status:422});
  if(subscription.metadata?.terms_version!=="membership-2026-11-24-v1")return new Response("Membership terms version missing",{status:422});
  // A subscription's item carries the current billing period in modern Stripe API versions.
  const periodEnd=items[0].current_period_end;
  if(!Number.isFinite(periodEnd)||periodEnd<=0)return new Response("Billing period unavailable",{status:503});
  if(!allowedStatuses.has(subscription.status))return new Response("Unsupported status",{status:422});
  // Never grant active access without a Stripe-confirmed paid invoice.
  let status=subscription.status;
  if(status==="active"){
   const latest=typeof subscription.latest_invoice==="string"?subscription.latest_invoice:subscription.latest_invoice?.id;
   if(!latest)return new Response("Invoice evidence unavailable",{status:503});
   const invoice=await stripe.invoices.retrieve(latest);
   if(invoice.livemode!==true)return new Response("Invoice mode mismatch",{status:422});
   if(invoice.status!=="paid"||invoice.livemode!==true||invoice.currency!=="gbp"||invoice.amount_remaining!==0||invoice.amount_paid<500||invoice.total<500||invoice.amount_paid_off_stripe>0)status="past_due";
  }
  const row={reservation_key:subscription.metadata.reservation_key,stripe_subscription_id:subscription.id,user_id:userId,stripe_customer_id:customer,stripe_price_id:PRICE,status,current_period_end:new Date(periodEnd*1000).toISOString(),cancel_at_period_end:subscription.cancel_at_period_end,last_stripe_event_created:event.created,updated_at:new Date().toISOString()};
  // First invoice only; renewals and lifecycle replays cannot create a second contract job.
  let firstInvoiceId:string|null=null;
  let recipient:string|null=null;
  if(status==="active"){
   const latest=typeof subscription.latest_invoice==="string"?subscription.latest_invoice:subscription.latest_invoice?.id;
   const candidateId=event.type==="invoice.paid"&&typeof obj.id==="string"?obj.id:latest;
   if(!candidateId)return new Response("Invoice evidence unavailable",{status:503});
   const candidate=await stripe.invoices.retrieve(candidateId,{expand:["payments"]});
   if(candidate.billing_reason==="subscription_create"){
    const raw=candidate as unknown as Record<string,any>;
    const linked=raw.parent?.subscription_details?.subscription??raw.subscription;
    const invoiceCustomer=typeof candidate.customer==="string"?candidate.customer:candidate.customer?.id;
    if(candidate.livemode!==true||linked!==subscription.id||invoiceCustomer!==customer||candidate.status!=="paid"||
       candidate.currency!=="gbp"||candidate.amount_paid!==500||candidate.total!==500||candidate.amount_remaining!==0||
       (typeof raw.amount_paid_off_stripe==="number"&&raw.amount_paid_off_stripe!==0)||raw.paid_out_of_band===true)
     return new Response("Initial invoice evidence invalid",{status:503});
    // Positive payment evidence, rather than assuming invoice status alone proves funds were collected.
    const payments=raw.payments;
    if(!payments||payments.has_more!==false||!Array.isArray(payments.data))return new Response("Invoice payments unavailable",{status:503});
    const paid=payments.data.filter((payment:any)=>payment.status==="paid");
    if(paid.length!==1||paid[0].amount_paid!==500||paid[0].currency!=="gbp"||paid[0].payment?.type!=="payment_intent"||
      typeof paid[0].payment.payment_intent!=="string")return new Response("Initial payment evidence unavailable",{status:503});
    const intent=await stripe.paymentIntents.retrieve(paid[0].payment.payment_intent);
    const intentCustomer=typeof intent.customer==="string"?intent.customer:intent.customer?.id;
    if(intent.livemode!==true||intent.status!=="succeeded"||intent.currency!=="gbp"||intent.amount_received!==500||intentCustomer!==customer)
      return new Response("Initial payment mismatch",{status:503});
    if(!user.user.email_confirmed_at||!user.user.email)return new Response("Confirmed account email required",{status:503});
    firstInvoiceId=candidate.id;recipient=user.user.email;
   }
  }
  // One transaction: if the required confirmation cannot be enqueued, membership update rolls back.
  const {data:applied,error}=await admin.rpc("apply_membership_event_and_confirmation",{p_payload:row,p_first_invoice_id:firstInvoiceId,p_recipient:recipient});
  if(error||applied!==true){console.error("Membership sync failed",error?.code||"unconfirmed");return new Response("Retry membership sync",{status:503});}
  return new Response("Production membership synchronized",{status:200});
 }catch(e){console.error("Membership webhook failure",String(e));return new Response("Retry later",{status:503});}
});
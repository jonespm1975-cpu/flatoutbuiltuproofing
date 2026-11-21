import {prepareFulfilmentRecord} from "./prepare-fulfilment-record.mjs";
/**
 * Sandbox-only webhook workflow. Production adapters are NOT attached.
 * verifySignedEvent(rawBody, signature) MUST use Stripe's constructEventAsync
 * with a dedicated sk_test webhook-signing secret before inspecting a payload.
 * getLineItems(sessionId) MUST call Stripe API, never trust request JSON.
 * persistConfirmation(record,eventId) MUST use an atomic, idempotent database
 * transaction keyed by session ID; it must not send email synchronously.
 */
export async function processSandboxWebhook({
  rawBody,signature,verifySignedEvent,getLineItems,
  persistConfirmation,courseConfig,courseTitles
}){
  if(typeof rawBody!=="string" || !rawBody || typeof signature!=="string" || !signature)
    return {status:400,code:"signature_required"};
  if(typeof verifySignedEvent!=="function"||typeof getLineItems!=="function"||typeof persistConfirmation!=="function")
    return {status:503,code:"adapter_unavailable"};
  let event;
  try { event=await verifySignedEvent(rawBody,signature); }
  catch {return {status:400,code:"invalid_signature"};}
  if(!event || typeof event.id!=="string" || !event.id.startsWith("evt_"))
    return {status:400,code:"invalid_event"};
  if(!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type))
    return {status:200,code:"ignored_event"};
  const session=event.data?.object;
  if(!session || session.mode==="subscription") return {status:200,code:"not_course_purchase"};
  if(event.livemode!==false || session.livemode!==false)
    return {status:400,code:"wrong_environment"};
  if(session.payment_status!=="paid") return {status:200,code:"awaiting_payment"};
  if(typeof session.id!=="string" || !session.id.startsWith("cs_test_"))
    return {status:422,code:"invalid_session"};
  let lineItems;
  try {lineItems=await getLineItems(session.id);}
  catch {return {status:503,code:"line_items_unavailable"};}
  const planned=prepareFulfilmentRecord({
    event,session,lineItems,courseConfig,courseTitles,expectedLivemode:false
  });
  if(!planned.ok) return {status:422,code:planned.reason};
  let saved;
  try {saved=await persistConfirmation(planned.record,event.id);}
  catch {return {status:503,code:"confirmation_save_failed"};}
  if(saved?.status==="inserted") return {status:200,code:"recorded",course_id:planned.record.course_id};
  if(saved?.status==="already_recorded" && saved?.record?.stripe_checkout_session_id===planned.record.stripe_checkout_session_id
     && saved?.record?.user_id===planned.record.user_id && saved?.record?.course_id===planned.record.course_id)
    return {status:200,code:"duplicate_acknowledged",course_id:planned.record.course_id};
  return {status:503,code:"idempotency_reconciliation_required"};
}

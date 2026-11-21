import Stripe from "npm:stripe@23.2.0";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";

const paymentAdjustmentEvents = new Set([
  "charge.refunded",
  "refund.created",
  "refund.updated",
  "refund.failed",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "charge.dispute.funds_withdrawn",
  "charge.dispute.funds_reinstated",
]);
const resolvedWithoutLoss = new Set(["won", "warning_closed", "prevented"]);

const lifecycleEvents = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
]);
const statuses = new Set(["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"]);
const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const verifier = new Stripe("webhook-verifier");

function objectId(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return undefined;
}

function subscriptionIdFrom(event: Stripe.Event): string | undefined {
  if (event.type.startsWith("customer.subscription.")) return objectId(event.data.object);
  if (event.type.startsWith("checkout.session.")) return objectId((event.data.object as Stripe.Checkout.Session).subscription);
  const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
  return objectId(invoice.parent?.subscription_details?.subscription ?? invoice.subscription);
}

async function affectedSubscriptionIds(stripe: Stripe, event: Stripe.Event): Promise<string[]> {
  if (!paymentAdjustmentEvents.has(event.type)) {
    const id = subscriptionIdFrom(event);
    return id?.startsWith("sub_") ? [id] : [];
  }

  const adjustment = event.data.object as Stripe.Charge | Stripe.Refund | Stripe.Dispute;
  let paymentIntentId = objectId(adjustment.payment_intent);
  if (!paymentIntentId && "charge" in adjustment) {
    const chargeId = objectId(adjustment.charge);
    if (chargeId) {
      const charge = await stripe.charges.retrieve(chargeId);
      if (!charge.livemode) throw new Error("Unexpected Stripe charge mode");
      paymentIntentId = objectId(charge.payment_intent);
    }
  }
  if (!paymentIntentId?.startsWith("pi_")) return [];

  const payments = await stripe.invoicePayments.list({
    payment: { type: "payment_intent", payment_intent: paymentIntentId },
    status: "paid", limit: 20,
  });
  if (payments.has_more) throw new Error("Invoice payment mapping requires review");
  const invoiceIds = new Set(payments.data.filter(payment => payment.livemode)
    .map(payment => objectId(payment.invoice)).filter((id): id is string => Boolean(id)));
  const subscriptionIds = new Set<string>();
  for (const invoiceId of invoiceIds) {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    if (!invoice.livemode) throw new Error("Unexpected Stripe invoice mode");
    const subscriptionId = objectId(invoice.parent?.subscription_details?.subscription);
    if (subscriptionId?.startsWith("sub_")) subscriptionIds.add(subscriptionId);
  }
  return [...subscriptionIds];
}

async function remainingPayment(stripe: Stripe, paymentIntentId: string, paidAmount: number) {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
  const charge = intent.latest_charge;
  if (!intent.livemode || intent.id !== paymentIntentId || intent.status !== "succeeded" ||
      intent.currency !== "gbp" || intent.amount_received < paidAmount ||
      !charge || typeof charge === "string" || !charge.livemode || charge.status !== "succeeded" ||
      !charge.paid || !charge.captured || charge.currency !== "gbp" ||
      objectId(charge.payment_intent) !== paymentIntentId || charge.amount_captured < paidAmount ||
      charge.refunded || charge.amount_refunded >= paidAmount) return 0;

  const disputes = await stripe.disputes.list({ charge: charge.id, limit: 20 });
  if (disputes.has_more || disputes.data.some(dispute =>
    !dispute.livemode || !resolvedWithoutLoss.has(dispute.status)
  )) return 0;

  return paidAmount - charge.amount_refunded;
}

async function paidCurrentPeriod(stripe: Stripe, subscription: Stripe.Subscription, item: Stripe.SubscriptionItem) {
  const invoiceId = objectId(subscription.latest_invoice);
  if (!invoiceId) return false;
  const invoice = await stripe.invoices.retrieve(invoiceId);
  if (!invoice.livemode || invoice.status !== "paid" || invoice.currency !== "gbp" ||
      objectId(invoice.customer) !== objectId(subscription.customer) ||
      objectId(invoice.parent?.subscription_details?.subscription) !== subscription.id ||
      invoice.total !== 199 || invoice.amount_paid < 199 || invoice.amount_remaining !== 0 ||
      (invoice.amount_paid_off_stripe ?? 0) !== 0 || invoice.lines.has_more) return false;

  if (!invoice.lines.data.some(line =>
    line.parent?.subscription_item_details?.subscription_item === item.id &&
    line.parent.subscription_item_details.proration === false &&
    line.period.start === item.current_period_start && line.period.end === item.current_period_end
  )) return false;

  const payments = await stripe.invoicePayments.list({ invoice: invoiceId, status: "paid", limit: 20 });
  if (payments.has_more) return false;
  const amountsByIntent = new Map<string, number>();
  for (const payment of payments.data) {
    if (!payment.livemode || payment.status !== "paid" || payment.currency !== "gbp" ||
        payment.payment.type !== "payment_intent" || !payment.amount_paid) continue;
    const paymentIntentId = objectId(payment.payment.payment_intent);
    if (!paymentIntentId) continue;
    amountsByIntent.set(paymentIntentId, Math.max(amountsByIntent.get(paymentIntentId) ?? 0, payment.amount_paid));
  }
  const remaining = await Promise.all([...amountsByIntent].map(([id, paid]) => remainingPayment(stripe, id, paid)));
  return remaining.reduce((total, amount) => total + amount, 0) >= 199;
}

async function reconcileMembership(
  stripe: Stripe, db: SupabaseClient, id: string, event: Stripe.Event, priceId: string,
) {
  const { data: syncOrder, error: orderError } = await db.rpc("begin_live_membership_sync");
  if (orderError || typeof syncOrder !== "number" || !Number.isSafeInteger(syncOrder) || syncOrder <= 0) throw new Error("Database sync unavailable");

  const subscription = await stripe.subscriptions.retrieve(id);
  if (!subscription.livemode || subscription.id !== id) throw new Error("Unexpected Stripe subscription");
  if (subscription.metadata.membership !== "monthly-learning") return new Response("Ignored", { status: 200 });

  const userId = subscription.metadata.supabase_user_id;
  const terms = subscription.metadata.membership_terms_version;
  const customer = objectId(subscription.customer);
  if (subscription.metadata.mode !== "live" || !userIdPattern.test(userId) || !terms ||
      !/^[a-zA-Z0-9_.-]{1,80}$/.test(terms) || !customer || !statuses.has(subscription.status)) {
    return new Response("Subscription mapping unavailable", { status: 422 });
  }

  const sessions = await stripe.checkout.sessions.list({ subscription: id, limit: 2 });
  const checkout = sessions.data.length === 1 && !sessions.has_more ? sessions.data[0] : undefined;
  if (!checkout || checkout.status !== "complete" || checkout.payment_status !== "paid") {
    return new Response("Awaiting paid membership checkout", { status: 200 });
  }
  if (!checkout.livemode || checkout.mode !== "subscription" || checkout.client_reference_id !== userId ||
      objectId(checkout.customer) !== customer ||
      checkout.currency !== "gbp" || checkout.amount_total !== 199 ||
      checkout.metadata?.membership_terms_version !== terms ||
      checkout.metadata.eligibility_policy !== "uk-address-v1" ||
      checkout.collected_information?.shipping_details?.address?.country !== "GB") {
    return new Response("UK checkout eligibility or agreement not verified", { status: 422 });
  }

  const intentId = checkout.metadata.membership_checkout_intent;
  if (!intentId || !userIdPattern.test(intentId) || checkout.metadata.terms_accepted !== "true" ||
      checkout.metadata.recurring_billing_consent !== "true" ||
      checkout.metadata.immediate_access_consent !== "true" ||
      checkout.metadata.cancellation_acknowledgement !== "true") {
    return new Response("Membership agreement not verified", { status: 422 });
  }
  const items = subscription.items.data;
  const item = items[0];
  const price = item?.price;
  const expectedPrice = !subscription.items.has_more && items.length === 1 && item.quantity === 1 &&
    price.id === priceId && price.currency === "gbp" && price.unit_amount === 199 &&
    price.recurring?.interval === "month" && price.recurring.interval_count === 1;
  let status = subscription.status;
  if (status === "active" && (!expectedPrice || !(await paidCurrentPeriod(stripe, subscription, item)))) {
    status = "past_due";
  }
  const end = item?.current_period_end;
  const periodEnd = Number.isSafeInteger(end) && end > 0 ? new Date(end * 1000) : new Date(0);
  const { data: synced, error } = await db.rpc("sync_live_membership_order", {
    p_intent: intentId, p_session: checkout.id, p_terms: terms,
    p_payload: {
      stripe_subscription_id: id,
      stripe_customer_id: customer,
      stripe_price_id: priceId,
      user_id: userId,
      status,
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || subscription.cancel_at !== null,
      last_stripe_event_created: event.created,
      sync_order: syncOrder,
    },
  });
  if (error) throw new Error("Database membership write failed");
  if (synced !== true) return new Response("Membership agreement not verified", { status: 422 });
  return new Response("Membership synchronized", { status: 200 });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe signature", { status: 400 });
  const signingSecret = Deno.env.get("MEMBERSHIP_LIVE_WEBHOOK_SECRET");
  if (!signingSecret) return new Response("Webhook configuration unavailable", { status: 503 });

  let event: Stripe.Event;
  try {
    event = await verifier.webhooks.constructEventAsync(
      await request.text(), signature, signingSecret, undefined, Stripe.createSubtleCryptoProvider()
    );
  } catch {
    return new Response("Invalid Stripe signature", { status: 400 });
  }
  if (!event.livemode || event.account) return new Response("Unexpected Stripe account or mode", { status: 400 });
  if (!lifecycleEvents.has(event.type) && !paymentAdjustmentEvents.has(event.type)) return new Response("Ignored", { status: 200 });
  if (Deno.env.get("MEMBERSHIP_LIVE_FULFILMENT_ENABLED") !== "true") {
    return new Response("Membership fulfilment closed", { status: 503 });
  }

  const key = Deno.env.get("MEMBERSHIP_LIVE_WEBHOOK_STRIPE_KEY");
  const priceId = Deno.env.get("MEMBERSHIP_LIVE_PRICE_ID");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key || !/^(rk|sk)_live_/.test(key) || !priceId?.startsWith("price_") || !url || !serviceKey) {
    return new Response("Membership configuration unavailable", { status: 503 });
  }

  try {
    const stripe = new Stripe(key);
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const subscriptionIds = await affectedSubscriptionIds(stripe, event);
    if (!subscriptionIds.length) return new Response("Ignored", { status: 200 });
    for (const id of subscriptionIds) {
      const response = await reconcileMembership(stripe, db, id, event, priceId);
      if (!response.ok) return response;
    }
    return new Response("Membership events reconciled", { status: 200 });
  } catch {
    console.error("Live membership synchronization failed", event.id);
    return new Response("Retry membership sync", { status: 503 });
  }
});

import Stripe from "npm:stripe@23.2.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const origin = "https://flatoutbuiltuproofing.co.uk";
const returnUrl = origin + "/members.html";
const cancellableStatuses = ["active", "past_due", "unpaid", "paused", "trialing"];
const headers = {
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "Vary": "Origin",
};

function reply(status: number, body: { error: string } | { url: string }) {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (request) => {
  if (request.headers.get("Origin") !== origin) return reply(403, { error: "Forbidden origin" });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, { error: "Method not allowed" });

  if (Deno.env.get("MEMBERSHIP_LIVE_PORTAL_ENABLED") !== "true") {
    return reply(503, { error: "Membership cancellation is unavailable online" });
  }

  const bearer = request.headers.get("Authorization");
  if (!bearer?.startsWith("Bearer ") || !bearer.slice(7).trim()) {
    return reply(401, { error: "Sign in required" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const stripeKey = Deno.env.get("MEMBERSHIP_LIVE_PORTAL_STRIPE_KEY");
  const priceId = Deno.env.get("MEMBERSHIP_LIVE_PRICE_ID");
  const configurationId = Deno.env.get("MEMBERSHIP_LIVE_PORTAL_CONFIGURATION_ID");
  if (!url || !anonKey || !stripeKey || !/^(rk|sk)_live_/.test(stripeKey) ||
      !priceId?.startsWith("price_") || !configurationId?.startsWith("bpc_")) {
    return reply(503, { error: "Membership cancellation is temporarily unavailable" });
  }

  try {
    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: bearer } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(bearer.slice(7));
    if (authError || !user || user.is_anonymous) return reply(401, { error: "Sign in required" });

    const { data: subscriptions, error } = await supabase.from("membership_subscriptions")
      .select("stripe_customer_id,stripe_subscription_id")
      .eq("user_id", user.id)
      .eq("livemode", true)
      .eq("stripe_price_id", priceId)
      .in("status", cancellableStatuses)
      .limit(2);
    if (error) return reply(503, { error: "Membership lookup unavailable" });
    if (!subscriptions?.length) return reply(404, { error: "No subscription to cancel" });
    if (subscriptions.length !== 1) return reply(409, { error: "Contact support to manage your subscriptions" });

    const record = subscriptions[0];
    const stripe = new Stripe(stripeKey);
    const subscription = await stripe.subscriptions.retrieve(record.stripe_subscription_id);
    const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const items = subscription.items.data;
    const price = items[0]?.price;
    if (subscription.id !== record.stripe_subscription_id || !subscription.livemode ||
        customer !== record.stripe_customer_id || subscription.metadata.supabase_user_id !== user.id ||
        subscription.metadata.membership !== "monthly-learning" || subscription.metadata.mode !== "live" ||
        subscription.items.has_more || items.length !== 1 || items[0]?.quantity !== 1 ||
        price?.id !== priceId || price.currency !== "gbp" || price.unit_amount !== 199 ||
        price.recurring?.interval !== "month" || price.recurring.interval_count !== 1) {
      return reply(403, { error: "Membership verification failed" });
    }
    if (!cancellableStatuses.includes(subscription.status)) {
      return reply(409, { error: "This membership is no longer available to cancel" });
    }
    if (subscription.cancel_at_period_end || subscription.cancel_at) {
      return reply(409, { error: "Cancellation is already scheduled" });
    }

    const configuration = await stripe.billingPortal.configurations.retrieve(configurationId);
    if (!configuration.livemode || !configuration.active ||
        !configuration.features.subscription_cancel.enabled ||
        configuration.features.subscription_cancel.mode !== "at_period_end") {
      return reply(503, { error: "Membership cancellation is temporarily unavailable" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer,
      configuration: configurationId,
      return_url: returnUrl,
      flow_data: {
        type: "subscription_cancel",
        subscription_cancel: { subscription: subscription.id },
        after_completion: { type: "redirect", redirect: { return_url: returnUrl } },
      },
    });
    if (!session.livemode || !session.url || new URL(session.url).origin !== "https://billing.stripe.com") {
      return reply(503, { error: "Membership cancellation is temporarily unavailable" });
    }
    return reply(200, { url: session.url });
  } catch {
    return reply(503, { error: "Membership cancellation is temporarily unavailable" });
  }
});

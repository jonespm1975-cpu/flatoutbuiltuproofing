import Stripe from "npm:stripe@23.2.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const origin = "https://flatoutbuiltuproofing.co.uk";
const headers = {
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "Vary": "Origin",
};

type Intent = {
  state: "reserved";
  id: string;
  stripe_price_id: string;
  terms_version: string;
  consent_recorded_at: string;
  stripe_session_id: string | null;
  retry_allowed: boolean;
};
type Reservation = Intent | { state: "existing_membership" };

function reply(status: number, body: { error: string } | { url: string }) {
  return new Response(JSON.stringify(body), { status, headers });
}

function verifySession(session: Stripe.Checkout.Session, intent: Intent, userId: string) {
  if (!session.livemode || session.mode !== "subscription" || session.client_reference_id !== userId ||
      !session.id.startsWith("cs_live_") || session.amount_total !== 199 || session.currency !== "gbp" ||
      session.metadata?.membership_checkout_intent !== intent.id ||
      session.metadata.membership_terms_version !== intent.terms_version) {
    throw new Error("Unexpected membership checkout");
  }
}

async function canReplaceSession(stripe: Stripe, session: Stripe.Checkout.Session, userId: string) {
  if (session.status === "expired") return true;
  if (session.status !== "complete" || !session.subscription) return false;

  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const checkoutCustomer = typeof session.customer === "string" ? session.customer : session.customer?.id;
  return subscription.livemode && subscription.id === subscriptionId && customerId === checkoutCustomer &&
    subscription.metadata.supabase_user_id === userId && subscription.metadata.membership === "monthly-learning" &&
    subscription.metadata.mode === "live" && ["canceled", "incomplete_expired"].includes(subscription.status);
}

Deno.serve(async (request) => {
  if (request.headers.get("Origin") !== origin) return reply(403, { error: "Forbidden origin" });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, { error: "Method not allowed" });
  if (Deno.env.get("MEMBERSHIP_LIVE_CHECKOUT_ENABLED") !== "true") {
    return reply(503, { error: "Monthly membership checkout is closed" });
  }

  const bearer = request.headers.get("Authorization");
  if (!bearer?.startsWith("Bearer ") || !bearer.slice(7).trim()) {
    return reply(401, { error: "Sign in required" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = Deno.env.get("MEMBERSHIP_LIVE_CHECKOUT_STRIPE_KEY");
  const priceId = Deno.env.get("MEMBERSHIP_LIVE_PRICE_ID");
  const termsVersion = Deno.env.get("MEMBERSHIP_LIVE_TERMS_VERSION");
  if (!supabaseUrl || !anonKey || !serviceKey || !stripeKey || !/^(rk|sk)_live_/.test(stripeKey) ||
      !priceId?.startsWith("price_") || !termsVersion || !/^[a-zA-Z0-9_.-]{1,80}$/.test(termsVersion)) {
    return reply(503, { error: "Monthly membership checkout is temporarily unavailable" });
  }

  const agreement = await request.json().catch(() => null);
  if (agreement?.terms_version !== termsVersion ||
      agreement?.terms_accepted !== true || agreement?.recurring_billing_consent !== true ||
      agreement?.immediate_access_consent !== true || agreement?.cancellation_acknowledgement !== true) {
    return reply(422, { error: "Review the current membership terms and confirm each checkout statement" });
  }

  try {
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: bearer } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await client.auth.getUser(bearer.slice(7));
    if (authError || !user || user.is_anonymous) return reply(401, { error: "Sign in required" });

    const userId = user.id;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const stripe = new Stripe(stripeKey, { timeout: 10000, maxNetworkRetries: 0 });
    async function reserve(replaceId?: string): Promise<Reservation> {
      const { data, error } = await admin.rpc("reserve_live_membership_checkout", {
        p_user: userId, p_price: priceId, p_terms: termsVersion, p_replace: replaceId ?? null,
      });
      if (error || (data?.state !== "reserved" && data?.state !== "existing_membership")) {
        throw new Error("Membership reservation unavailable");
      }
      return data;
    }

    let replaceId: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const intent = await reserve(replaceId);
      if (intent.state === "existing_membership") {
        return reply(409, { error: "You already have a subscription. Manage it from My Learning." });
      }

      let sessionId = intent.stripe_session_id;
      if (!sessionId) {
        if (!intent.retry_allowed || intent.terms_version !== termsVersion || intent.stripe_price_id !== priceId) {
          return reply(409, { error: "We need to verify your earlier checkout. Contact us for help." });
        }

        const price = await stripe.prices.retrieve(priceId);
        if (!price.active || !price.livemode || price.currency !== "gbp" || price.unit_amount !== 199 ||
            price.recurring?.interval !== "month" || price.recurring.interval_count !== 1 ||
            price.recurring.usage_type !== "licensed") throw new Error("Unexpected membership price");

        const subscriptionMetadata = {
          supabase_user_id: userId,
          membership: "monthly-learning",
          mode: "live",
          membership_terms_version: intent.terms_version,
        };
        const created = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: intent.stripe_price_id, quantity: 1 }],
          client_reference_id: userId,
          subscription_data: { metadata: subscriptionMetadata },
          automatic_tax: { enabled: false },
          shipping_address_collection: { allowed_countries: ["GB"] },
          custom_text: { shipping_address: { message: "Enter your UK address to confirm eligibility. Membership is delivered online." } },
          success_url: origin + "/members.html?membership=checkout-return",
          cancel_url: origin + "/membership-order.html?checkout=cancel",
          integration_identifier: "learning-pass-qmvxtrjk",
          metadata: {
            ...subscriptionMetadata,
            membership_checkout_intent: intent.id,
            eligibility_policy: "uk-address-v1",
            consent_recorded_at: intent.consent_recorded_at,
            terms_accepted: "true",
            recurring_billing_consent: "true",
            immediate_access_consent: "true",
            cancellation_acknowledgement: "true",
          },
        }, { idempotencyKey: "live-learning-pass-v1-" + intent.id });
        verifySession(created, intent, userId);

        const { data: stored, error } = await admin.rpc("record_live_membership_checkout", {
          p_user: userId, p_intent: intent.id, p_session: created.id,
        });
        if (error || stored !== true) throw new Error("Checkout could not be recorded");
        sessionId = created.id;
      }

      // Stripe can return the original response when an idempotent request is retried.
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      verifySession(session, intent, userId);
      if (session.status === "open") {
        if (intent.terms_version !== termsVersion || intent.stripe_price_id !== priceId) {
          return reply(409, { error: "An older checkout is still open. Wait for it to expire or contact us." });
        }
        if (!session.url || new URL(session.url).origin !== "https://checkout.stripe.com") {
          throw new Error("Checkout destination unavailable");
        }
        return reply(200, { url: session.url });
      }

      if (!(await canReplaceSession(stripe, session, userId))) {
        return reply(409, { error: "A previous checkout is being verified. Check My Learning or contact us." });
      }
      replaceId = intent.id;
    }
    return reply(409, { error: "Please refresh to check your membership checkout again" });
  } catch {
    return reply(503, { error: "Monthly membership checkout is temporarily unavailable" });
  }
});

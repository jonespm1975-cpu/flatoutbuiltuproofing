import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { termsHtml, version } from "./terms-v1.ts";

type ConfirmationJob = {
  job_id: string;
  claim_token: string;
  stripe_session_id: string;
  recipient_email: string;
  terms_version: string;
  consent_recorded_at: string;
};
type Outcome = "sent" | "provider-retry" | "provider-rejected" | "template-unavailable";

const origin = "https://flatoutbuiltuproofing.co.uk";
const encoder = new TextEncoder();
const membershipTermsUrl = origin + "/membership-terms-" + version + ".html";
const termsAttachment = {
  filename: "Monthly-Learning-Pass-terms-" + version + ".html",
  content: btoa(String.fromCharCode(...encoder.encode(termsHtml))),
  content_type: "text/html; charset=utf-8",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function matchesToken(provided: string, expected: string) {
  const [left, right] = await Promise.all([provided, expected].map(token =>
    crypto.subtle.digest("SHA-256", encoder.encode(token)).then(bytes => new Uint8Array(bytes))
  ));
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

function confirmationText(job: ConfirmationJob) {
  const consentDate = new Date(job.consent_recorded_at).toLocaleString("en-GB", {
    timeZone: "Europe/London", dateStyle: "long", timeStyle: "short",
  });
  return [
    "Flat Out Built-Up Roofing — Monthly Learning Pass confirmation",
    "",
    "Order reference: " + job.stripe_session_id,
    "You paid £1.99. Your subscription renews at £1.99 per month until cancelled. No VAT was charged.",
    "The pass includes the Voice Learning App’s guided built-up felt roofing walkthrough. Roof Inspection and Planning is a separate purchase.",
    "",
    "Access your membership: " + origin + "/members.html",
    "To stop your next renewal, choose Cancel monthly membership in My Learning and confirm in Stripe before your next charge. Access normally continues to the end of the paid period.",
    "",
    "At " + consentDate + " (UK time), you accepted membership terms " + version + " and authorised the recurring charge.",
    "You expressly consented to supply during the 14-day cancellation period. You acknowledged loss of the initial cancellation right once digital supply begins, where the legal conditions are met. You can still stop future renewals. Your statutory rights are unaffected.",
    "",
    "Keep the attached copy of your membership terms, cancellation and refunds information.",
    "Online terms: " + membershipTermsUrl,
    "Seller: Paul Jones trading as Flat Out Built-Up Roofing.",
    "Contact: jonespm1975@gmail.com",
  ].join("\n");
}

async function send(job: ConfirmationJob, apiKey: string, from: string) {
  if (job.terms_version !== version) return { outcome: "template-unavailable" as const, providerId: null };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": "learning-pass-confirmation-" + job.job_id,
      },
      body: JSON.stringify({
        from,
        to: [job.recipient_email],
        subject: "Your Flat Out Built-Up Roofing Learning Pass confirmation",
        text: confirmationText(job),
        attachments: [termsAttachment],
      }),
    });
    if (!response.ok) {
      const retryable = [408, 409, 429].includes(response.status) || response.status >= 500;
      return { outcome: retryable ? "provider-retry" as const : "provider-rejected" as const, providerId: null };
    }
    const result = await response.json();
    if (typeof result?.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(result.id)) {
      return { outcome: "provider-retry" as const, providerId: null };
    }
    return { outcome: "sent" as const, providerId: result.id };
  } catch {
    return { outcome: "provider-retry" as const, providerId: null };
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return respond(405, { error: "Method not allowed" });
  const authorization = request.headers.get("Authorization");
  const token = Deno.env.get("MEMBERSHIP_LIVE_CONFIRMATION_WORKER_TOKEN");
  if (!token || token.length < 32 || !authorization?.startsWith("Bearer ") ||
      !(await matchesToken(authorization.slice(7), token))) return respond(401, { error: "Unauthorised" });
  if (Deno.env.get("MEMBERSHIP_LIVE_CONFIRMATION_ENABLED") !== "true") {
    return respond(200, { enabled: false });
  }
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("PURCHASE_CONFIRMATION_FROM");
  if (!key || !url || !apiKey || !from) return respond(503, { error: "Email configuration unavailable" });

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: jobs, error } = await db.rpc("claim_live_membership_confirmations", { p_limit: 2 });
  if (error || !Array.isArray(jobs)) return respond(503, { error: "Unable to claim confirmation jobs" });

  let accepted = 0;
  let retries = 0;
  let attention = 0;
  let finalizationErrors = 0;
  for (const job of jobs as ConfirmationJob[]) {
    const { outcome, providerId }: { outcome: Outcome; providerId: string | null } = await send(job, apiKey, from);
    const { data: finalized, error: finishError } = await db.rpc("finish_live_membership_confirmation", {
      p_job: job.job_id, p_token: job.claim_token, p_outcome: outcome, p_provider_message_id: providerId,
    });
    if (finishError || finalized !== true) finalizationErrors++;
    else if (outcome === "sent") accepted++;
    else if (outcome === "provider-retry") retries++;
    else attention++;
  }
  return respond(finalizationErrors ? 503 : 200, {
    claimed: jobs.length, accepted, retries, attention, finalization_errors: finalizationErrors,
  });
});

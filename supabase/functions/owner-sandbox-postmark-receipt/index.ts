import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const recipient = "flatoutbuiltuproofing@gmail.com";
function reply(status: number, state: string) {
  return Response.json({state}, {status, headers: {"Cache-Control": "no-store"}});
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply(405, "post_required");
  const nonce = req.headers.get("x-owner-check") || "";
  if (!/^[0-9a-f]{64}$/.test(nonce)) return reply(401, "unauthorized");
  const token = Deno.env.get("POSTMARK_SERVER_TOKEN");
  const sender = Deno.env.get("FUTURE_CONFIRMATION_FROM");
  if (!token || token === "POSTMARK_API_TEST" || sender?.toLowerCase() !== "info@flatoutbuiltuproofing.co.uk"
      || Deno.env.get("FUTURE_CONFIRMATION_PROVIDER") !== "postmark") return reply(503, "sender_unavailable");
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const claim = await db.rpc("claim_owner_sandbox_receipt", {p_nonce: nonce});
  if (claim.error) return reply(503, "claim_unavailable");
  if (typeof claim.data !== "string" || !claim.data.startsWith("cs_test_")) return reply(409, "no_claim");
  try {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST", signal: AbortSignal.timeout(15000),
      headers: {"Accept":"application/json","Content-Type":"application/json","X-Postmark-Server-Token":token},
      body: JSON.stringify({From:sender, To:recipient, MessageStream:"outbound",
        Subject:"Flat Out Built-Up Roofing — sandbox course receipt",
        TextBody:"Owner test receipt for the Beginner Training Course. Stripe recorded a £9.99 test-mode checkout. No money was charged. Test order reference: " + claim.data,
        Tag:"fobur-owner-sandbox-receipt", TrackOpens:false, TrackLinks:"None"})
    });
    const result = await res.json();
    if (!res.ok || result.ErrorCode !== 0 || result.To?.toLowerCase() !== recipient || !result.MessageID)
      return reply(502, "review");
    const finish = await db.rpc("finish_owner_sandbox_receipt", {p_nonce:nonce, p_id:result.MessageID});
    return finish.data === true ? reply(200, "accepted") : reply(503, "review");
  } catch {
    return reply(503, "review");
  }
});

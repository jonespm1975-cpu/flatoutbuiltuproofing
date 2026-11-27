import { createClient } from "npm:@supabase/supabase-js@2.49.4";
const ORIGIN = "https://flatoutbuiltuproofing.co.uk";
const CORS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Vary": "Origin"
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

const GUIDE = {
  title: "Built-up felt roofing — guided learning",
  description: "A voice-guided planning and quality checklist for learning the stages of a built-up felt roofing project.",
  sections: [
    { heading: "Step 1 · Survey and plan", body: "Start with the project specification and a safe roof survey. Confirm the roof use, existing construction, outlets, upstands, penetrations and access arrangements. Do not walk on a fragile surface or assume the deck is sound. Record anything that needs a competent person to assess before work proceeds." },
    { heading: "Step 2 · Check the deck", body: "Confirm that the supporting structure and deck are dry, sound, securely fixed and suitable for the specified build-up. Check moisture damage, movement, contamination and fixing condition. Stop and arrange an assessment if the deck is wet, soft, damaged or structurally uncertain." },
    { heading: "Step 3 · Plan falls and drainage", body: "Identify the intended water flow, outlets, gutters and vulnerable low points. Check that the specified insulation and waterproofing build-up preserves drainage and required upstand heights. Resolve ponding risks and outlet details before covering the deck." },
    { heading: "Step 4 · Confirm the compatible system", body: "Use the project specification and one compatible manufacturer system. Confirm the vapour control layer, insulation, underlays, cap sheet, primers and detailing products are approved to work together. Do not substitute products or rely on appearance as proof of compatibility." },
    { heading: "Step 5 · Prepare people and the work area", body: "Before any installation, check competence, access, edge protection, fragile-surface controls, weather limits, exclusion zones and emergency arrangements. Torch-applied work needs a documented hot-work risk assessment, method statement, fire precautions and suitable supervision. If these are not in place, stop and ask the responsible competent person." },
    { heading: "Step 6 · Set out the waterproofing sequence", body: "Follow the selected system’s current manufacturer instructions for layer order, lap widths, stagger, direction of work, terminations and detailing. Plan outlets, corners, penetrations and upstands before the main field is covered. Keep the specified details visible in the work pack." },
    { heading: "Step 7 · Inspect each hold point", body: "Check the deck, falls, insulation, laps, junctions and penetrations at the agreed inspection stages. Look for missed details, damage, trapped moisture and drainage obstructions. Photograph concealed stages where the quality plan requires it. Correct defects using the approved system method before proceeding." },
    { heading: "Step 8 · Complete and hand over", body: "Carry out the final inspection against the specification and manufacturer guidance. Confirm outlets are clear, details are complete, the work area is safe and required hot-work fire monitoring is completed by the responsible person. Provide maintenance guidance and retain the inspection record." }
  ],
  safety: "Training aid only. It does not authorise work at height or torch use, and it is not a substitute for competent supervision, a project-specific risk assessment, method statement, or the selected manufacturer’s instructions."
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && origin !== ORIGIN) return reply(403, { error: "This learning app is available from the official website only." });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET") return reply(405, { error: "Method not allowed." });

  const bearer = req.headers.get("Authorization") || "";
  if (!bearer.startsWith("Bearer ")) return reply(401, { error: "Sign in to check your learning access." });
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return reply(503, { error: "Access check is temporarily unavailable." });

  const accessToken = bearer.slice(7);
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: bearer } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: identity, error: authError } = await userClient.auth.getUser(accessToken);
  if (authError || !identity.user || identity.user.is_anonymous) return reply(401, { error: "Sign in to check your learning access." });

  // Explicit preview is a separate mode; verified owner identity is required.
  const owner = identity.user.id === "87fca075-224a-4379-bafb-3a01e41890f4"
    && identity.user.email?.toLowerCase() === "jonespm1975@gmail.com";
  if (new URL(req.url).searchParams.get("preview") === "owner") {
    if (!owner) return reply(403, { code: "ACCESS_REQUIRED", error: "Owner preview is restricted. Open the normal learning app to check paid access." });
    return reply(200, { entitled: true, access: "owner-preview", courseIds: [], lessonIds: [], guide: GUIDE });
  }

  const [membership, courses, lessons] = await Promise.all([
    userClient.rpc("has_active_membership"),
    userClient.from("course_access").select("course_id,stripe_checkout_session_id").like("stripe_checkout_session_id", "cs_live_%"),
    userClient.from("lesson_access").select("lesson_id,stripe_session_id").like("stripe_session_id", "cs_live_%")
  ]);
  if (membership.error || courses.error || lessons.error) return reply(503, { error: "Your learning access could not be checked. Please try again." });

  const courseIds = [...new Set((courses.data || []).filter(row => typeof row.stripe_checkout_session_id === "string" && row.stripe_checkout_session_id.startsWith("cs_live_")).map(row => row.course_id))];
  const lessonIds = [...new Set((lessons.data || []).filter(row => typeof row.stripe_session_id === "string" && row.stripe_session_id.startsWith("cs_live_")).map(row => String(row.lesson_id)))];
  const hasSubscription = membership.data === true;
  if (!hasSubscription && !courseIds.length && !lessonIds.length) {
    return reply(403, { code: "ACCESS_REQUIRED", ownerPreviewAvailable: owner, error: "Mobile learning is included with an active monthly membership or a paid course on this account." });
  }

  return reply(200, {
    entitled: true,
    access: hasSubscription ? "subscription" : "paid-course",
    courseIds,
    lessonIds,
    guide: GUIDE
  });
});
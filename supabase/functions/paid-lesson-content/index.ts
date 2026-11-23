import { createClient } from "npm:@supabase/supabase-js@2.49.4";
const origin="https://flatoutbuiltuproofing.co.uk";
const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS","Vary":"Origin","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const lesson={title:"Beginner Training Course — Lesson 1: Roof Inspection and Planning",sections:[
{heading:"1. Start with the roof, not the membrane",body:"A sound built-up felt roofing project begins with a documented inspection. Identify the roof's intended use, structure, existing coverings, outlets, upstands, rooflights and any signs of moisture ingress. Do not assume that an existing roof deck is structurally suitable merely because it looks sound from above."},
{heading:"2. Deck suitability",body:"OSB3 and plywood are common timber-based decking products, but thickness, support spacing, fixings, moisture condition and structural loading must follow the design and manufacturer specification. Wet or deteriorated decks need investigation and appropriate remedial work before covering."},
{heading:"3. Falls and drainage",body:"Map where water will flow, including outlets, gutters, changes in level and areas vulnerable to ponding. Check that proposed insulation and waterproofing details do not block drainage or reduce critical upstand heights. Follow the relevant UK design standards and the selected system manufacturer's requirements."},
{heading:"4. System compatibility",body:"Record the specified vapour control layer, insulation, underlays, cap sheet, primers and detailing products. Products should be selected as a compatible, approved system. Do not substitute a membrane or adhesive based only on appearance or price."},
{heading:"5. Fire and work-at-height controls",body:"Torch-applied bitumen involves serious fire risk, particularly near timber, hidden cavities and combustible details. Roof edges, fragile surfaces and access routes present fall hazards. Practical installation must be undertaken only by competent people under a suitable risk assessment, method statement and emergency arrangements. This online lesson is not authorisation to use a roofing torch."},
{heading:"6. Record the quality plan",body:"Before installation, agree inspection hold points for deck condition, falls, insulation, laps, junctions, penetrations and completed waterproofing. Photograph concealed stages where appropriate and retain manufacturer guidance, specifications and inspection records."},
{heading:"Knowledge check",body:"What should be confirmed before selecting membranes? Answer: deck condition, structural suitability, drainage, design requirements and compatibility of the complete waterproofing system. Why are penetrations high-risk? Answer: they interrupt the main waterproofing plane and require carefully specified detailing."}
]};
Deno.serve(async req=>{
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
 if(req.method!=="GET") return new Response("Method not allowed",{status:405,headers:cors});
 const bearer=req.headers.get("authorization")||"";
 if(!bearer.startsWith("Bearer ")) return new Response(JSON.stringify({error:"Sign in required"}),{status:401,headers:cors});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!anon) return new Response(JSON.stringify({error:"Service unavailable"}),{status:503,headers:cors});
 const client=createClient(url,anon,{global:{headers:{Authorization:bearer}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:authError}=await client.auth.getUser(bearer.slice(7));
 if(authError||!identity.user||identity.user.is_anonymous) return new Response(JSON.stringify({error:"Sign in required"}),{status:401,headers:cors});
 const {data:access,error}=await client.from("course_access").select("id").eq("user_id",identity.user.id).eq("course_id","beginner-training-course").like("stripe_checkout_session_id","cs_live_%").limit(1);
 if(error) return new Response(JSON.stringify({error:"Access check unavailable"}),{status:503,headers:cors});
 if(!access?.length) return new Response(JSON.stringify({error:"This course is not unlocked for your account"}),{status:403,headers:cors});
 return new Response(JSON.stringify(lesson),{status:200,headers:cors});
});
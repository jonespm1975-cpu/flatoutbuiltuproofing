/**
 * PROPOSED STAGING FUNCTION ONLY. Not deployed.
 * Does not replace the existing beginner paid-lesson-content endpoint.
 * Individual courses are served only after a verified Supabase user + RLS access check.
 */
import {createClient} from "npm:@supabase/supabase-js@2.49.4";
import {COURSE_IDS,decideCourseAccess} from "../../../fulfilment/protected-course-access.mjs";
const ORIGIN="https://flatoutbuiltuproofing.co.uk";
const headers={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization, apikey, content-type",
 "Access-Control-Allow-Methods":"GET, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"};
const respond=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.headers.get("origin") && req.headers.get("origin")!==ORIGIN)return respond(403,{code:"forbidden_origin"});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="GET")return respond(405,{code:"method_not_allowed"});
 // No changes to existing production security; second rollout flag is disabled by default.
 if(Deno.env.get("COURSE_24_PROTECTED_LESSONS_ENABLED")!=="true")return respond(503,{code:"not_enabled"});
 const courseId=new URL(req.url).searchParams.get("course_id");
 if(!courseId||!COURSE_IDS.includes(courseId))return respond(404,{code:"unknown_course"});
 const bearer=req.headers.get("authorization")||"";
 if(!bearer.startsWith("Bearer "))return respond(401,{code:"sign_in_required"});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!anon)return respond(503,{code:"not_configured"});
 const client=createClient(url,anon,{global:{headers:{Authorization:bearer}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:authError}=await client.auth.getUser(bearer.slice(7));
 if(authError||!identity.user||identity.user.is_anonymous)return respond(401,{code:"sign_in_required"});
 // Uses logged-in user's RLS context. The browser cannot choose another user.
 const {data:entitlements,error}=await client.from("course_access")
   .select("user_id,course_id,stripe_checkout_session_id")
   .eq("user_id",identity.user.id)
   .eq("course_id",courseId)
   .like("stripe_checkout_session_id","cs_test_%")
   .limit(2);
 if(error)return respond(503,{code:"access_check_unavailable"});
 // Content is intentionally not configured for unfinished courses. Do NOT read from
 // a publicly reachable JSON file; approved lessons must be bundled server-side.
 const approvedContent: Record<string,unknown>={};
 const decision=decideCourseAccess({courseId,verifiedUserId:identity.user.id,entitlements,content:approvedContent[courseId],environment:"test"});
 return respond(decision.status,decision.status===200?decision.lesson:{code:decision.code});
});

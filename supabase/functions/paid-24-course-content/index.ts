/**
 * PROPOSED STAGING FUNCTION ONLY. Not deployed.
 * Does not replace the existing beginner paid-lesson-content endpoint.
 * Individual courses are served only after a verified Supabase user + RLS access check.
 */
import {createClient} from "npm:@supabase/supabase-js@2.49.4";
import {COURSE_IDS,decideCourseAccess} from "../../../fulfilment/protected-course-access.mjs";
import {PRIVATE_BUCKET,lessonObjectPath,parseVerifiedPrivateLesson} from "../../../fulfilment/private-lesson-store.mjs";
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
 // Do not touch private data without a verified purchased entitlement.
 // The pure gate deliberately denies missing content; only an individually owned
 // test checkout may progress to the service-only private bucket read.
 const ownership=entitlements?.some(e=>e.user_id===identity.user.id&&e.course_id===courseId&&e.stripe_checkout_session_id?.startsWith("cs_test_"));
 if(!ownership)return respond(403,{code:"course_not_owned"});
 // A separate release switch must be approved once every lesson is technically
 // verified. Existing owner-approved draft files fail this gate.
 if(Deno.env.get("COURSE_24_TECHNICAL_RELEASE_ENABLED")!=="true")
   return respond(503,{code:"technical_review_required"});
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!serviceKey)return respond(503,{code:"private_storage_unavailable"});
 const path=lessonObjectPath(courseId);
 if(!path)return respond(404,{code:"unknown_course"});
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:file,error:storageError}=await admin.storage.from(PRIVATE_BUCKET).download(path);
 if(storageError||!file)return respond(503,{code:"private_lesson_unavailable"});
 const parsed=parseVerifiedPrivateLesson({courseId,rawPayload:await file.text(),allowTechnicalRelease:true});
 if(!parsed.ok)return respond(503,{code:parsed.reason});
 const verified={course_id:courseId,title:parsed.lesson.title,published:true,verified:true,
  sections:parsed.lesson.units.map((u:{heading:string;explanation:string})=>({heading:u.heading,body:u.explanation}))};
 const decision=decideCourseAccess({courseId,verifiedUserId:identity.user.id,entitlements,content:verified,environment:"test"});
 if(decision.status!==200)return respond(decision.status,{code:decision.code});
 return respond(200,{...parsed.lesson,price_display:undefined});

});

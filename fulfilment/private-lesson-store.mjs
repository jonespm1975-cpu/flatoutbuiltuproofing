/** Private server-side paid lesson payload contract.
 * This module has no network access and NEVER writes to public GitHub/Storage.
 * Access control must happen first in the Supabase Edge Function using auth.getUser
 * and current-user RLS course_access row. Never trust browser ownership claims.
 */
export const LESSON_PREFIXES=Object.freeze(["built-up","tile-slate","metal-sheet","liquid-applied"]);
export const VALID_LESSON_IDS=Object.freeze(LESSON_PREFIXES.flatMap(prefix=>Array.from({length:6},(_,i)=>prefix+"-"+String(i+1).padStart(2,"0"))));
export const PRIVATE_BUCKET="paid-lessons-private";
export function lessonObjectPath(courseId){
 if(!VALID_LESSON_IDS.includes(courseId))return null;
 return "lessons/"+courseId+".json";
}
export function parseVerifiedPrivateLesson({courseId,rawPayload,allowTechnicalRelease=false}={}){
 if(!VALID_LESSON_IDS.includes(courseId))return {ok:false,reason:"unknown_course"};
 if(typeof rawPayload!=="string"||rawPayload.length>300000||rawPayload.length<1000)return {ok:false,reason:"invalid_payload"};
 let lesson;try{lesson=JSON.parse(rawPayload)}catch{return {ok:false,reason:"invalid_json"}}
 if(!lesson||lesson.course_id!==courseId||typeof lesson.title!=="string"||lesson.title.length<4
    ||!Array.isArray(lesson.units)||lesson.units.length!==4
    ||!lesson.units.every(x=>typeof x?.heading==="string"&&typeof x?.explanation==="string"&&x.explanation.length>80)
    ||!Array.isArray(lesson.quiz)||lesson.quiz.length!==3
    ||!lesson.quiz.every(x=>typeof x?.question==="string"&&Array.isArray(x?.options)&&x.options.length>=2)
    ||!Array.isArray(lesson.inspection_record)||lesson.inspection_record.length<4)
     return {ok:false,reason:"course_body_incomplete"};
 // Current owner-approved drafts remain explicitly locked. Only technical verified
 // bodies carrying a release marker can be served after separate operator approval.
 if(!allowTechnicalRelease||lesson.content_stage!=="technical_verified_for_release"
    ||lesson.release_approved!==true)return {ok:false,reason:"technical_review_required"};
 return {ok:true,lesson};
}

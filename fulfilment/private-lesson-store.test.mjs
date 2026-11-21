import assert from "node:assert/strict";
import {lessonObjectPath,parseVerifiedPrivateLesson,VALID_LESSON_IDS} from "./private-lesson-store.mjs";
assert.equal(VALID_LESSON_IDS.length,24);
assert.equal(new Set(VALID_LESSON_IDS).size,24);
for(const id of VALID_LESSON_IDS){
 assert.equal(lessonObjectPath(id),"lessons/"+id+".json");
 const sample={course_id:id,title:"Verified owner roofing lesson",content_stage:"draft_for_qualified_review",release_approved:false,
  units:Array.from({length:4},(_,i)=>({heading:"Topic "+i,explanation:"This is a test-only paragraph for private delivery validation. It is not an installation method and must never be published."})),
  quiz:Array.from({length:3},(_,i)=>({question:"Question "+i,options:["one","two"],answer_index:0})),
  inspection_record:["a","b","c","d"]};
 const payload=JSON.stringify(sample);
 assert.equal(parseVerifiedPrivateLesson({courseId:id,rawPayload:payload}).reason,"technical_review_required");
 assert.equal(parseVerifiedPrivateLesson({courseId:id,rawPayload:payload,allowTechnicalRelease:true}).reason,"technical_review_required");
 sample.content_stage="technical_verified_for_release";sample.release_approved=true;
 assert.equal(parseVerifiedPrivateLesson({courseId:id,rawPayload:JSON.stringify(sample)}).reason,"technical_review_required");
 assert.equal(parseVerifiedPrivateLesson({courseId:id,rawPayload:JSON.stringify(sample),allowTechnicalRelease:true}).ok,true);
 sample.course_id=VALID_LESSON_IDS[(VALID_LESSON_IDS.indexOf(id)+1)%24];
 assert.equal(parseVerifiedPrivateLesson({courseId:id,rawPayload:JSON.stringify(sample),allowTechnicalRelease:true}).reason,"course_body_incomplete");
}
assert.equal(lessonObjectPath("../../other"),null);
console.log("PASS: 24 private object paths, draft denial, technical approval gates, course mismatch and release flag");

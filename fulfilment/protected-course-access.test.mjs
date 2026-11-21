import assert from "node:assert/strict";
import {COURSE_IDS,decideCourseAccess} from "./protected-course-access.mjs";
const a="11111111-1111-4111-8111-111111111111",b="22222222-2222-4222-8222-222222222222";
const mkContent=id=>({course_id:id,verified:true,published:true,title:"Verified lesson "+id,sections:[{heading:"Introduction",body:"Approved source material"},{heading:"Knowledge check",body:"Review"}]});
assert.equal(COURSE_IDS.length,24);
assert.equal(new Set(COURSE_IDS).size,24);
for(const [i,courseId] of COURSE_IDS.entries()){
 const owned=[{user_id:a,course_id:courseId,stripe_checkout_session_id:"cs_test_owned_"+i}];
 assert.equal(decideCourseAccess({courseId,verifiedUserId:a,entitlements:owned,content:mkContent(courseId)}).status,200);
 assert.equal(decideCourseAccess({courseId,verifiedUserId:b,entitlements:owned,content:mkContent(courseId)}).status,403);
 assert.equal(decideCourseAccess({courseId,verifiedUserId:a,entitlements:[],content:mkContent(courseId)}).status,403);
 assert.equal(decideCourseAccess({courseId,verifiedUserId:a,entitlements:owned,content:null}).status,503);
 assert.equal(decideCourseAccess({courseId,verifiedUserId:a,entitlements:owned,content:{...mkContent(courseId),published:false}}).status,503);
 assert.equal(decideCourseAccess({courseId,verifiedUserId:a,entitlements:owned,content:mkContent(COURSE_IDS[(i+1)%24])}).status,503);
 assert.equal(decideCourseAccess({courseId,verifiedUserId:a,entitlements:owned,content:mkContent(courseId),environment:"live"}).status,403);
 assert.equal(decideCourseAccess({courseId,verifiedUserId:a,entitlements:[{user_id:b,course_id:courseId,stripe_checkout_session_id:"cs_test_bad"}],content:mkContent(courseId)}).status,403);
}
assert.equal(decideCourseAccess({courseId:"unknown",verifiedUserId:a,entitlements:[]}).status,404);
assert.equal(decideCourseAccess({courseId:COURSE_IDS[0],verifiedUserId:"not-uuid",entitlements:[]}).status,401);
assert.equal(decideCourseAccess({courseId:COURSE_IDS[0],verifiedUserId:a,entitlements:null}).status,503);
console.log("PASS: 24 independent courses; owner-only access; no leaked lessons; unpublished content and live/test mismatches denied.");

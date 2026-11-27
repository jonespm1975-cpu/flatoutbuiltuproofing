// STAGED ONLY — not imported by production workers. No email sending code.
// Pass the final, immutable, independently reviewed terms/refund archive from server-owned code only.
// Never accept the archive or its approval flag from the client or payment metadata.
// Production activation requires matching checkout/fulfilment/queue version, service-only queue claims,
// verified payment and authenticated account, signed event replay tests and Postmark delivery evidence.
export const specialistTitles = Object.freeze({
  "bu-01": "Built-up membrane systems and specification",
  "bu-02": "Decks, substrates and moisture investigation",
  "bu-03": "Tapered insulation and falls planning",
  "bu-04": "Vapour control, insulation and interfaces",
  "bu-05": "Outlets, upstands and flashing review",
  "bu-06": "Quality, hot-work awareness and handover",
  "ts-01": "Roof geometry, pitch and setting-out",
  "ts-02": "Underlays, ventilation and battens",
  "ts-03": "Tile and slate systems, fixing design",
  "ts-04": "Ridges, hips, valleys and flashings",
  "ts-05": "Roof openings, abutments and weatherproof interfaces",
  "ts-06": "Inspection, maintenance and safe handover",
  "ms-01": "Sheet profiles and system selection",
  "ms-02": "Supports, fixing schedules and standing seams",
  "ms-03": "Weatherproofing, seals and interfaces",
  "ms-04": "Insulation, condensation and thermal design",
  "ms-05": "Handling, fragile surfaces and safe installation awareness",
  "ms-06": "Inspection, coatings and maintenance",
  "la-01": "Liquid system selection and design",
  "la-02": "Substrate assessment and preparation acceptance",
  "la-03": "Primers, adhesion and material compatibility",
  "la-04": "Reinforcement and junction detailing",
  "la-05": "Application conditions, coverage and cure review",
  "la-06": "Inspection, curing, maintenance and handover"
});
export function buildSpecialistConfirmation(row,from,archive,titles){
 const bad=()=>{throw Error("Ineligible specialist confirmation or missing approved contract archive")};
 if(!row||!archive||archive.approved!==true||typeof archive.version!=="string"||!/^specialist-[a-z0-9-]+-v[1-9]\d*$/.test(archive.version)||archive.version.includes("draft")||row.terms_version!==archive.version||!Object.hasOwn(titles,row.course_id)||row.paid_amount_pence!==999||row.currency!=="gbp"||!/^cs_live_[a-zA-Z0-9_]+$/.test(row.session_id)||!Number.isFinite(Date.parse(row.consent_recorded_at))||!Number.isFinite(Date.parse(row.confirmed_at))||Date.parse(row.confirmed_at)<Date.parse(row.consent_recorded_at)||!/^[-+.\w]+@[^@\s]+\.[^@\s]+$/.test(row.recipient_email)||!/^[^@\s]+@flatoutbuiltuproofing\.co\.uk$/i.test(from))bad();
 if(typeof archive.terms!=="string"||!archive.terms.trim()||typeof archive.refunds!=="string"||!archive.refunds.trim())bad();
 const course=titles[row.course_id], access="https://flatoutbuiltuproofing.co.uk/specialist-learning.html?course="+encodeURIComponent(row.course_id);
 const body=["Flat Out Built-Up Roofing — specialist course purchase", "Course: "+course, "Price paid: £9.99 GBP (one-off; no further payment due).", "Order reference: "+row.session_id,"Purchase recorded: "+new Date(row.confirmed_at).toISOString(),"Account: "+row.recipient_email,"Open your course: "+access,"Agreed terms version: "+archive.version,"Immediate digital supply consent and cancellation acknowledgement recorded: "+new Date(row.consent_recorded_at).toISOString()+". Your statutory rights are unaffected. This does not assert that your cancellation right has already been lost.","Agreed terms (retain this email):",archive.terms,"Agreed cancellation and refund policy:",archive.refunds].join("\n\n");
 const esc=s=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
 return {From:from,To:row.recipient_email,ReplyTo:"flatoutbuiltuproofing@gmail.com",Subject:"Flat Out Built-Up Roofing — "+course+" | £9.99 confirmation",TextBody:body,HtmlBody:"<html lang=\"en-GB\"><body><div style=\"font:15px/1.6 Arial,sans-serif;white-space:pre-wrap\">"+esc(body)+"</div><p><a href=\""+esc(access)+"\">Open your course</a></p></body></html>",MessageStream:"outbound",Tag:"specialist-course-contract-confirmation",TrackOpens:false,TrackLinks:"None"};
}
export function runTests(build,titles){
 const archive={approved:true,version:"specialist-test-v1",terms:"TEST FIXTURE ONLY — not agreed customer terms",refunds:"TEST FIXTURE ONLY — not agreed refund policy"};
 const base={session_id:"cs_live_fixture",recipient_email:"fixture@example.invalid",paid_amount_pence:999,currency:"gbp",terms_version:archive.version,consent_recorded_at:"2026-11-27T12:00:00Z",confirmed_at:"2026-11-27T12:01:00Z"};
 const from="fixture@flatoutbuiltuproofing.co.uk";
 let passed=0,rejected=0;
 for(const [id,title] of Object.entries(titles)){
 const result=build({...base,course_id:id},from,archive,titles);
 if(!result.Subject.includes(title)||!result.TextBody.includes("specialist-learning.html?course="+id)||!result.HtmlBody.includes("£9.99")||!result.TextBody.includes(archive.terms)||!result.TextBody.includes(archive.refunds)||result.To!==base.recipient_email||result.TrackOpens!==false||result.TrackLinks!=="None")throw Error("Bad payload "+id);
 passed++;
 }
 for(const [row,a,sender] of [[{course_id:"unknown"},archive,from],[{terms_version:"specialist-draft-v1"},{...archive,version:"specialist-draft-v1"},from],[{paid_amount_pence:100},archive,from],[{session_id:"cs_test_fixture"},archive,from],[{currency:"usd"},archive,from],[{}, {...archive,approved:false},from],[{}, {...archive,refunds:""},from],[{},archive,"other@example.invalid"],[{terms_version:"specialist-other-v1"},archive,from]]){
 let blocked=false;try{build({...base,course_id:"bu-01",...row},sender,a,titles)}catch{blocked=true}if(!blocked)throw Error("Invalid payload accepted");rejected++;
 }
 return {passed,rejected};
}
// Deterministic, no-network test: deno test this module.
if(typeof Deno!=="undefined")Deno.test("24 specialist Postmark payloads and rejection cases",()=>{const r=runTests(buildSpecialistConfirmation,specialistTitles);if(r.passed!==24||r.rejected!==9)throw Error("Incomplete coverage");});

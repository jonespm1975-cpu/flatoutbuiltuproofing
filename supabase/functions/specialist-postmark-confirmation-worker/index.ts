// Sends queued course confirmations through Postmark when delivery is enabled.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";
// Separate specialist worker. No scheduler activation or customer email until separately approved.
const RELEASE_APPROVED=false;
const specialistContract = Object.freeze({
  "version": "specialist-2026-11-27-v1",
  "approved": false,
  "terms": "Seller: Paul Jones trading as Flat Out Built-Up Roofing, sole trader in England. Business contact address: 52 Bedhampton Way, Leigh Park, Havant, Hampshire, PO9 2DP, United Kingdom. Email: flatoutbuiltuproofing@gmail.com. Contact us here for support and complaints. Stripe processes payments; the seller remains your contracting party.\nProduct: one individually selected specialist roofing course, identified by its title, course ID and stated learning objective. English-language online educational written lessons, a case study and knowledge check. Training is general education, not a formal qualification, CSCS card, competence certificate or permission to undertake hazardous work. Follow competent supervision, applicable rules, site-specific risk assessments and manufacturer instructions.\nPrice: £9.99 GBP total, paid once for this course. No VAT charged while the seller is not VAT registered. No delivery fee, subscription or recurring charge. Membership and other courses are separate and are not included. UK customers only; eligibility is checked at checkout.\nDelivery and access: payment is made using Stripe Checkout. Protected digital content is made available online to the purchasing signed-in account after verified payment. Access is intended to continue while the learning service operates; it is not a promise of indefinite operation. No minimum recurring commitment. Access requires a compatible current web browser, internet, JavaScript and browser storage for sign-in. Offline or downloadable access is not promised. If accessibility or compatibility is uncertain, ask us before paying.\nThe order page shows the selected course and full price before payment. You must actively accept these terms, request immediate supply and acknowledge the applicable loss of cancellation rights separately. If you prefer to retain the cancellation period, contact us about delayed supply before ordering. A durable confirmation of the contract and consent will be emailed to the purchasing account. If access or confirmation fails, contact us; do not pay again.\nMaterials are for personal learning; do not redistribute or bypass account access controls except as permitted by law. Keep account credentials secure. We may maintain or correct content but will act fairly if access is materially reduced or the service closes. Statutory remedies remain available.\nEnglish and Welsh law applies, subject to mandatory consumer protections and access to courts applicable to you. Nothing limits non-excludable statutory rights.",
  "refunds": "Consumers normally have 14 days to cancel a distance contract for digital content, starting the day after the contract is made. Send a clear cancellation notice before the period ends; the optional form below may be used but is not required.\nIf you expressly request supply during that period and acknowledge that your cancellation right will be lost when supply begins, we will rely on loss of that right only after supply has begun and the required durable confirmation of the contract, consent and acknowledgement has been provided. A preselected checkbox, silence or opening the website is not consent. If required consent, acknowledgement or confirmation is missing, we will not rely on loss of the right. Contact us before ordering if you want to discuss delayed supply.\nFor cancellations, access problems, complaints or refunds email flatoutbuiltuproofing@gmail.com or write to the seller at the address in the terms. Include your course name, order date, account email and order reference if known; never send card details. We will assess the request fairly. Any refund due will be made without undue delay and within 14 days where the statutory cancellation refund deadline applies, using the original payment method unless otherwise expressly agreed, without a refund administration charge.\nYour statutory rights under the Consumer Rights Act 2015 remain unaffected, including remedies for faulty, inaccessible or misdescribed digital content, such as repair, replacement, price reduction or refund where applicable.\nOptional cancellation form: To Paul Jones trading as Flat Out Built-Up Roofing, 52 Bedhampton Way, Leigh Park, Havant, Hampshire, PO9 2DP, United Kingdom, flatoutbuiltuproofing@gmail.com. I give notice that I cancel my contract for the following digital course: [course]. Ordered on: [date]. Consumer name: [name]. Consumer address: [address]. Account email: [email]. Signature (only if submitted on paper): [signature]. Date: [date].",
  "courses": {
    "bu-01": {
      "title": "Built-up membrane systems and specification",
      "objective": "Interpret a system specification and identify incompatible substitutions."
    },
    "bu-02": {
      "title": "Decks, substrates and moisture investigation",
      "objective": "Recognise evidence needed to confirm substrate suitability."
    },
    "bu-03": {
      "title": "Tapered insulation and falls planning",
      "objective": "Interpret tapered board layouts and identify drainage discrepancies."
    },
    "bu-04": {
      "title": "Vapour control, insulation and interfaces",
      "objective": "Explain the relationship between moisture, thermal performance and continuity."
    },
    "bu-05": {
      "title": "Outlets, upstands and flashing review",
      "objective": "Identify critical water-control interfaces and required design records."
    },
    "bu-06": {
      "title": "Quality, hot-work awareness and handover",
      "objective": "Recognise high-risk conditions, inspection records and handover requirements."
    },
    "ts-01": {
      "title": "Roof geometry, pitch and setting-out",
      "objective": "Read approved pitch, roof geometry and setting-out information."
    },
    "ts-02": {
      "title": "Underlays, ventilation and battens",
      "objective": "Identify coordinated underlay, ventilation and batten requirements."
    },
    "ts-03": {
      "title": "Tile and slate systems, fixing design",
      "objective": "Understand product identification and the purpose of fixing specifications."
    },
    "ts-04": {
      "title": "Ridges, hips, valleys and flashings",
      "objective": "Recognise junction details and water-control design dependencies."
    },
    "ts-05": {
      "title": "Roof openings, abutments and weatherproof interfaces",
      "objective": "Review changes around rooflights, chimneys and adjacent construction."
    },
    "ts-06": {
      "title": "Inspection, maintenance and safe handover",
      "objective": "Assess roof condition using documented safe inspection methods."
    },
    "ms-01": {
      "title": "Sheet profiles and system selection",
      "objective": "Identify roof profile, system components and design dependencies."
    },
    "ms-02": {
      "title": "Supports, fixing schedules and standing seams",
      "objective": "Interpret documented support and fastening requirements."
    },
    "ms-03": {
      "title": "Weatherproofing, seals and interfaces",
      "objective": "Identify the role of approved seals and junctions."
    },
    "ms-04": {
      "title": "Insulation, condensation and thermal design",
      "objective": "Understand why thermal and moisture design must be coordinated."
    },
    "ms-05": {
      "title": "Handling, fragile surfaces and safe installation awareness",
      "objective": "Recognise sheet-roof hazards and safe planning responsibilities."
    },
    "ms-06": {
      "title": "Inspection, coatings and maintenance",
      "objective": "Review condition and handover information without overclaiming remedies."
    },
    "la-01": {
      "title": "Liquid system selection and design",
      "objective": "Identify the approved liquid-applied roof system and its design dependencies."
    },
    "la-02": {
      "title": "Substrate assessment and preparation acceptance",
      "objective": "Recognise evidence of suitable substrate preparation."
    },
    "la-03": {
      "title": "Primers, adhesion and material compatibility",
      "objective": "Identify compatibility records and the purpose of adhesion assessment."
    },
    "la-04": {
      "title": "Reinforcement and junction detailing",
      "objective": "Identify the role of specified reinforcement and coordinated details."
    },
    "la-05": {
      "title": "Application conditions, coverage and cure review",
      "objective": "Understand why product-specific limits and inspection records matter."
    },
    "la-06": {
      "title": "Inspection, curing, maintenance and handover",
      "objective": "Prepare traceable inspection and maintenance information."
    }
  }
});
const specialistConsent = Object.freeze({
  "terms": "I accept the specialist-course terms and cancellation/refund policy shown above.",
  "immediate": "I expressly request that supply of this digital course begins immediately, before my 14-day cancellation period ends.",
  "cancel": "I acknowledge that I will lose my statutory cancellation right once supply begins after my express consent, subject to the legal requirements for that loss being met."
});

const specialistTitles = Object.freeze({
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
function buildSpecialistConfirmation(row,from,archive,titles){
 const bad=()=>{throw Error("Ineligible specialist confirmation or missing approved contract archive")};
 if(!row||!archive||archive.approved!==true||typeof archive.version!=="string"||!/^specialist-[a-z0-9-]+-v[1-9]\d*$/.test(archive.version)||archive.version.includes("draft")||row.terms_version!==archive.version||!Object.hasOwn(titles,row.course_id)||row.paid_amount_pence!==999||row.currency!=="gbp"||!/^cs_live_[a-zA-Z0-9_]+$/.test(row.session_id)||!Number.isFinite(Date.parse(row.consent_recorded_at))||!Number.isFinite(Date.parse(row.confirmed_at))||Date.parse(row.confirmed_at)<Date.parse(row.consent_recorded_at)||!/^[-+.\w]+@[^@\s]+\.[^@\s]+$/.test(row.recipient_email)||!/^[^@\s]+@flatoutbuiltuproofing\.co\.uk$/i.test(from))bad();
 if(typeof archive.terms!=="string"||!archive.terms.trim()||typeof archive.refunds!=="string"||!archive.refunds.trim())bad();
 const course=titles[row.course_id], access="https://flatoutbuiltuproofing.co.uk/specialist-learning.html?course="+encodeURIComponent(row.course_id);
 const body=["Flat Out Built-Up Roofing — specialist course purchase", "Course: "+course, "Course ID: "+row.course_id, ...(archive.courses?.[row.course_id]?.objective ? ["Learning objective: "+archive.courses[row.course_id].objective] : []), "Price paid: £9.99 GBP (one-off; no further payment due).", "Order reference: "+row.session_id,"Purchase recorded: "+new Date(row.confirmed_at).toISOString(),"Account: "+row.recipient_email,"Open your course: "+access,"Agreed terms version: "+archive.version,"Immediate digital supply consent and cancellation acknowledgement recorded: "+new Date(row.consent_recorded_at).toISOString()+". Your statutory rights are unaffected. This does not assert that your cancellation right has already been lost.","Agreed consent statements:",...Object.values(specialistConsent),"Agreed terms (retain this email):",archive.terms,"Agreed cancellation and refund policy:",archive.refunds].join("\n\n");
 const esc=s=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
 return {From:from,To:row.recipient_email,ReplyTo:"flatoutbuiltuproofing@gmail.com",Subject:"Flat Out Built-Up Roofing — "+course+" | £9.99 confirmation",TextBody:body,HtmlBody:"<html lang=\"en-GB\"><body><div style=\"font:15px/1.6 Arial,sans-serif;white-space:pre-wrap\">"+esc(body)+"</div><p><a href=\""+esc(access)+"\">Open your course</a></p></body></html>",MessageStream:"outbound",Tag:"specialist-course-contract-confirmation",TrackOpens:false,TrackLinks:"None"};
}
function runTests(build,titles){
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

function verifySpecialistPayloads(){
 const generic=runTests(buildSpecialistConfirmation,specialistTitles);
 let matched=0,locked=0;
 const testArchive={...specialistContract,approved:true};
 for(const id of Object.keys(specialistTitles)){
  const row={session_id:"cs_live_fixture_only",recipient_email:"fixture@example.invalid",course_id:id,paid_amount_pence:999,currency:"gbp",terms_version:specialistContract.version,consent_recorded_at:"2026-11-27T12:00:00Z",confirmed_at:"2026-11-27T12:01:00Z"};
  const from="fixture@flatoutbuiltuproofing.co.uk";
  const email=buildSpecialistConfirmation(row,from,testArchive,specialistTitles);
  if(!email.TextBody.includes(specialistContract.courses[id].objective)||!email.TextBody.includes(specialistContract.terms)||!email.TextBody.includes(specialistContract.refunds)||!email.TextBody.includes("specialist-learning.html?course="+id)||!Object.values(specialistConsent).every(x=>email.TextBody.includes(x)))throw Error("Archive test failed");
  matched++;
  try{buildSpecialistConfirmation(row,from,specialistContract,specialistTitles);}catch{locked++;}
 }
 if(generic.passed!==24||generic.rejected!==9||matched!==24||locked!==24)throw Error("Incomplete no-send verification");
 return {payloads:matched,rejection_cases:generic.rejected,unapproved_contracts_blocked:locked};
}


const json=(code:number,body:Record<string,unknown>)=>
  new Response(JSON.stringify(body),{status:code,headers:{
    "content-type":"application/json","cache-control":"no-store",
    "x-content-type-options":"nosniff"
  }});

async function digestHex(value:string){
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
}

async function validWorkerKey(presented:string){
  if(!presented || presented.length>512)return false;
  const stored=Deno.env.get("FUTURE_CONFIRMATION_WORKER_KEY_SHA256");
  const legacy=Deno.env.get("FUTURE_CONFIRMATION_WORKER_KEY");
  const expected=stored || (legacy && await digestHex(legacy));
  if(!expected || !/^[0-9a-f]{64}$/.test(expected))return false;
  const actual=await digestHex(presented);
  let mismatch=0;
  for(let i=0;i<64;i++)mismatch|=actual.charCodeAt(i)^expected.charCodeAt(i);
  return mismatch===0;
}

Deno.serve(async req=>{
  if(req.method!=="POST")return json(405,{error:"Method not allowed"});
  const presented=req.headers.get("x-fobur-worker-key")||"";
  if(!await validWorkerKey(presented))return json(401,{error:"Unauthorized"});
  const checkOnly=req.headers.get("x-fobur-check-only")==="true";
  const sendingEnabled=RELEASE_APPROVED && specialistContract.approved && Deno.env.get("SPECIALIST_CONFIRMATION_DELIVERY_ENABLED")==="true";
  if(!checkOnly && !sendingEnabled)
    return json(503,{error:"Future confirmation delivery disabled"});
  if(Deno.env.get("FUTURE_CONFIRMATION_PROVIDER")!=="postmark")
    return json(503,{error:"Transactional provider not approved or configured"});
  const token=Deno.env.get("POSTMARK_SERVER_TOKEN")||"";
  const from=Deno.env.get("FUTURE_CONFIRMATION_FROM")||"";
  const dbUrl=Deno.env.get("SUPABASE_URL")||"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(token.length<12||token==="POSTMARK_API_TEST"||
    !/^[^@\s]+@flatoutbuiltuproofing\.co\.uk$/i.test(from)||!dbUrl||!serviceKey)
    return json(503,{error:"Transactional sender is not ready"});
  const admin=createClient(dbUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  if(checkOnly){
    const probe=await admin.rpc("claim_specialist_contract_confirmations",{p_limit:0});
    if(probe.error || !Array.isArray(probe.data) || probe.data.length!==0)
      return json(503,{error:"Confirmation queue check failed"});
    try { return json(200,{status:"specialist_postmark_no_send_ready",claimed:0,sending_enabled:sendingEnabled,contract_version:specialistContract.version,...verifySpecialistPayloads()}); } catch { return json(503,{error:"Specialist payload verification failed"}); }
  }
  const {data:items,error:claimErr}=await admin.rpc("claim_specialist_contract_confirmations",{p_limit:1});
  if(claimErr)return json(503,{error:"Future confirmation queue unavailable"});
  if(!Array.isArray(items)||items.length===0)return json(200,{status:"idle",claimed:0});
  const job=items[0];
  const finish=async(outcome:"accepted"|"review",messageId:string|null,details:string|null)=>{
    const {data,error}=await admin.rpc("finish_future_contract_confirmation",{
      p_session_id:job.session_id,p_claim_token:job.claim_token,
      p_outcome:outcome,p_provider_message_id:messageId,p_details:details
    });
    return !error&&data===true;
  };
  let email;
  try{email=buildSpecialistConfirmation(job,from,specialistContract,specialistTitles);}
  catch{
    const updated=await finish("review",null,"Validated order content could not be assembled");
    return json(updated?422:503,{error:"Contract details need manual review"});
  }
  try{
    const response=await fetch("https://api.postmarkapp.com/email",{
      method:"POST",
      headers:{"Accept":"application/json","Content-Type":"application/json",
        "X-Postmark-Server-Token":token},
      body:JSON.stringify(email),
      signal:AbortSignal.timeout(15000)
    });
    const reply=await response.json();
    // Postmark includes the destination in its response. A mismatch is
    // ambiguous: NEVER re-send automatically; reconcile the message manually.
    if(response.ok&&reply?.ErrorCode===0&&typeof reply?.MessageID==="string"&&reply.MessageID
       &&typeof reply?.To==="string"&&reply.To.trim().toLowerCase()===email.To.toLowerCase()){
      const updated=await finish("accepted",reply.MessageID,null);
      if(!updated)return json(503,{error:"Accepted by provider; queue requires manual reconciliation"});
      // Provider acceptance is NOT proof of recipient inbox delivery.
      return json(200,{status:"provider_accepted",delivered:false,claimed:1});
    }
    // An API rejection is not assumed safely replayable. Operator must review.
    const updated=await finish("review",null,"Provider rejected or did not confirm acceptance");
    return json(updated?502:503,{status:"review",delivered:false});
  }catch{
    // A network timeout may occur AFTER the provider accepts a message.
    // NEVER automatically retry with a fresh provider request after this.
    const updated=await finish("review",null,"Ambiguous provider outcome; do not automatically resend");
    return json(updated?502:503,{status:"review",delivered:false});
  }
});

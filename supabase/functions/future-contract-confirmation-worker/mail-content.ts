// Fixed contract-message generator for FUTURE verified £9.99 orders.
// The immutable terms/cancellation snapshot is embedded in the email itself:
// a webpage-only link is NOT sufficient durable contract confirmation.
import { contractAttachments } from "./contract-snapshot.ts";

export type Purchase = {
  session_id: string;
  recipient_email: string;
  course_id: string;
  paid_amount_pence: number;
  currency: string;
  terms_version: string;
  consent_recorded_at: string;
  confirmed_at: string;
};

const esc=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;")
  .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");

const archivedPolicies=contractAttachments.map(item=>{
  const decoded=new TextDecoder().decode(Uint8Array.from(atob(item.content),c=>c.charCodeAt(0)));
  const body=decoded.match(/<main>([\s\S]*?)<\/main>/i)?.[1];
  if(!body||!body.includes("21 November 2026"))throw new Error("Missing fixed policy snapshot");
  return {name:item.filename,html:body};
});
if(archivedPolicies.length!==2)throw new Error("Two archived policies are required");

export function buildDurableEmail(row:Purchase,verifiedSender:string){
  if(row.course_id!=="beginner-training-course"||
    row.terms_version!=="2026-11-21-course-v1"||
    row.paid_amount_pence!==999||row.currency.toLowerCase()!=="gbp"||
    !row.session_id.startsWith("cs_live_")||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.recipient_email)||
    !Number.isFinite(Date.parse(row.consent_recorded_at))||
    !Number.isFinite(Date.parse(row.confirmed_at)))
    throw new Error("Not an eligible verified live order");
  if(!/^[^@\s]+@flatoutbuiltuproofing\.co\.uk$/i.test(verifiedSender))
    throw new Error("Sender must be verified on the owned domain");
  const price="£9.99";
  const course="Beginner Training Course — Roof Inspection and Planning";
  const access="https://flatoutbuiltuproofing.co.uk/members.html";
  const orderId=esc(row.session_id);
  const purchasedAt=esc(new Date(row.confirmed_at).toISOString());
  const consentAt=esc(new Date(row.consent_recorded_at).toISOString());
  const details=`<h1>Flat Out Built-Up Roofing — your course purchase</h1>
<p><strong>This confirms an existing one-off digital course purchase. No extra payment is due.</strong></p>
<p><strong>Course:</strong> ${esc(course)}<br>
<strong>Price paid:</strong> ${price} (GBP; no VAT charged — seller not VAT-registered)<br>
<strong>Order reference:</strong> ${orderId}<br>
<strong>Purchase recorded:</strong> ${purchasedAt}<br>
<strong>Signed-in course account:</strong> ${esc(row.recipient_email)}<br>
<strong>Access:</strong> <a href="${access}">My Learning</a><br>
<strong>Agreed terms version:</strong> 2026-11-21-course-v1</p>
<p><strong>Digital supply consent and acknowledgement:</strong>
At ${consentAt}, the buyer expressly requested immediate access to the digital course
and acknowledged that the statutory cancellation right may be lost once supply begins
if all legal requirements have been fulfilled. This confirmation does not
assume that the cancellation right has already been lost.
Faulty or misdescribed digital content rights remain unaffected.</p>
<p><strong>Seller:</strong> Paul Jones trading as Flat Out Built-Up Roofing,
52 Bedhampton Way, Leigh Park, Havant, Hampshire PO9 2DP, United Kingdom.
Contact: <a href="mailto:flatoutbuiltuproofing@gmail.com">flatoutbuiltuproofing@gmail.com</a>.</p>
<p>The full agreed terms and cancellation/refund policy are embedded below
for you to retain with this email; they do not depend on any website link.</p>`;
  const policies=archivedPolicies.map((policy,i)=>`<section style="border-top:2px solid #aaa;margin-top:22px;padding-top:12px">
<h2>Archived agreed policy ${i+1}: ${esc(policy.name)}</h2>${policy.html}</section>`).join("\n");
  const html=`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"></head>
<body style="font:15px/1.5 Arial,sans-serif;color:#222;max-width:760px">
${details}${policies}</body></html>`;
  // Plain-text fallback also contains archived policies (not just a link).
  const textBody=html.replace(/<\/?(?:p|h[1-6]|section|blockquote|li|div|br)[^>]*>/gi,"\n")
    .replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&")
    .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'")
    .replace(/&quot;/g,'"').replace(/[ \t]{2,}/g," ");
  return {
    From:verifiedSender,To:row.recipient_email,ReplyTo:"flatoutbuiltuproofing@gmail.com",
    Subject:"Flat Out Built-Up Roofing — £9.99 course purchase and contract confirmation",
    HtmlBody:html,TextBody:textBody,MessageStream:"outbound",
    Tag:"one-off-course-contract-confirmation",
    // Essential contract messaging does not need behaviour analytics.
    TrackOpens:false,TrackLinks:"None"
  };
}

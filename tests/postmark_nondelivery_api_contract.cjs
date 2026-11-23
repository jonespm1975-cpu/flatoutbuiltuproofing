// Postmark official NON-DELIVERING API validation using its public documented
// POSTMARK_API_TEST token. No secrets, real buyer addresses or customer emails.
// https://postmarkapp.com/developer/api/overview#authentication
const assert=require("node:assert/strict");
const payload={
  From:"sender@example.com",To:"recipient@example.com",
  Subject:"FOBUR non-delivery API contract fixture — no mail will be sent",
  TextBody:"Synthetic fixture only. A real order does not exist.",
  HtmlBody:"<!doctype html><html><body><p>Synthetic fixture. No order exists.</p></body></html>",
  ReplyTo:"owner@example.com",Tag:"one-off-course-contract-confirmation",
  MessageStream:"outbound",TrackOpens:false,TrackLinks:"None"
};
assert.equal(payload.TrackOpens,false);
assert.equal(payload.TrackLinks,"None");
assert.ok(!JSON.stringify(payload).includes("flatoutbuiltuproofing.co.uk"));
const result=await fetch("https://api.postmarkapp.com/email",{
  method:"POST",
  headers:{"Accept":"application/json","Content-Type":"application/json",
    "X-Postmark-Server-Token":"POSTMARK_API_TEST"},
  body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)
});
const raw=await result.text();
let details;
try{details=JSON.parse(raw)}catch{throw Error("Postmark did not return valid JSON (HTTP "+result.status+")")}
console.log("Postmark API validation HTTP",result.status,"ErrorCode",details.ErrorCode,
  "recipient matches fixture",details.To===payload.To);
assert.equal(result.status,200,"Postmark test-only call must be syntactically valid");
assert.equal(details.ErrorCode,0,"Postmark must accept payload validation");
assert.equal(details.To,payload.To,"Postmark must echo expected fixture recipient");
assert.ok(typeof details.MessageID==="string"&&details.MessageID.length>0,"Missing acknowledgement ID");
console.log("PASS real Postmark API accepted no-delivery fixture with explicit tracking disabled");
console.log("IMPORTANT: POSTMARK_API_TEST does not send mail and does not verify a customer inbox.");

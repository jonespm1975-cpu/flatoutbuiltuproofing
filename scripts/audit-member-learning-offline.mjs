// Offline Playwright test of current account pages with simulated auth/API.
// No customer login, Stripe charge, production database call or email.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import assert from "node:assert/strict";
import {chromium} from "playwright";
const root=process.cwd();
const server=http.createServer((req,res)=>{
 const p=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
 if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(p,(err,data)=>{
  if(err){res.writeHead(404);res.end();return;}
  res.writeHead(200,{"Content-Type":p.endsWith(".js")?"text/javascript":p.endsWith(".html")?"text/html":"text/css"});
  res.end(data);
 });
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port;
function authFixture(paid, membership=false){
 const memberRow=membership?'[{status:"active"}]':'[]';
 const row=paid?'[{course_id:"beginner-training-course"}]':'[]';
 return [
  'const u={id:"11111111-1111-4111-8111-111111111111",email:"qa@example.invalid",is_anonymous:false};',
  'function from(table){const q={select(){return q},eq(){return q},like(){return q},limit(){return q},then(a,b){return Promise.resolve({data:table==="course_access"?'+row+':table==="membership_subscriptions"?'+memberRow+':[],error:null}).then(a,b)}};return q}',
  'export const supabase={auth:{getUser:async()=>({data:{user:u},error:null}),getSession:async()=>({data:{session:{access_token:"fixture"}},error:null}),onAuthStateChange:()=>({}),signOut:async()=>({error:null})},',
  'from, rpc:async name=>name==="has_active_membership"?{data:'+membership+',error:null}:{data:[],error:null}};',
  'export async function requireUser(){return u}'
 ].join("\n");
}
const record={stripe_checkout_session_id:"cs_live_fake_qa",course_id:"beginner-training-course",paid_amount_pence:999,terms_version:"2026-11-21-course-v1",confirmed_at:"2026-11-21T13:17:00Z",consent_recorded_at:"2026-11-21T13:16:00Z"};
let browser;
try{
 browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 for(const width of [390,1280]){
  for(const paid of [true,false]){
   const context=await browser.newContext({viewport:{width,height:850},isMobile:width===390,hasTouch:width===390});
   let lessonRequests=0,receiptRequests=0;
   await context.route("**/*",async route=>{
    const url=new URL(route.request().url());
    if(url.origin===base && url.pathname==="/auth.js")
      return route.fulfill({status:200,contentType:"text/javascript",body:authFixture(paid)});
    if(url.hostname==="fhyhshakmvqwzdyannec.supabase.co"){
     if(url.pathname.endsWith("/paid-lesson-content")){
      lessonRequests++;
      return route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify({title:"QA paid lesson",sections:[{heading:"Roof inspection",body:"Fixture content"}]})});
     }
     if(url.pathname.endsWith("/my-purchase-confirmations")){
      receiptRequests++;
      return route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify({customer_email:"qa@example.invalid",records:paid?[record]:[]})});
     }
     throw Error("Unplanned Supabase connection "+url.pathname);
    }
    if(url.origin!==base)throw Error("Unexpected network "+url.hostname);
    return route.continue();
   });
   const page=await context.newPage();
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base+"/members.html",{waitUntil:"load"});
   await page.locator("#account").waitFor({state:"visible"});
   const consent=page.getByRole("region",{name:"Optional analytics preferences"});
   await consent.waitFor({state:"visible"});
   await consent.getByRole("button",{name:"Reject optional analytics"}).click();
   await consent.waitFor({state:"hidden"});
   console.log("PASS analytics consent can be rejected without tracking",width);
   const button=page.getByRole("button",{name:"Open my paid lesson"});
   assert.equal(await button.count(),paid?1:0);
   assert.equal(await page.locator("#mobileAppAccess").isVisible(),paid);
   assert.equal(await page.locator("#paidContent").isVisible(),false);
   assert.equal(await page.locator("#sandboxMembershipManagement").isVisible(),false);
   assert.equal(await page.locator("#liveMembershipControls").isVisible(),false,"live release lock hides staged controls");
   if(paid){
    await button.click();
    await page.waitForFunction(()=>document.querySelector("#status")?.textContent==="Your lesson is ready.");
    assert.equal(await page.locator("#paidContent").isVisible(),true);
    assert.match(await page.locator("#paidSections").innerText(),/Roof inspection/);
   }
   assert.equal(lessonRequests,paid?1:0);
   console.log("PASS",width,paid?"paid member lesson":"unpaid member blocked");
   await page.goto(base+"/purchase-confirmations.html",{waitUntil:"load"});
   await page.waitForFunction(()=>!document.querySelector("#status")?.textContent.includes("Checking"));
   assert.equal(await page.locator(".receipt").count(),paid?1:0);
   assert.equal(await page.locator("#print").isVisible(),paid);
   if(paid){
    assert.match(await page.locator(".receipt").innerText(),/£9\.99/);
    const archive=page.locator(".receipt a[download]");
    assert.equal(await archive.count(),1,"paid customers receive fixed contract copy link");
    assert.equal(await archive.getAttribute("href"),"legal/2026-11-21-course-v1-contract-snapshot.html");
    const response=await page.request.get(base+"/legal/2026-11-21-course-v1-contract-snapshot.html");
    assert.equal(response.status(),200);
    const contractText=await response.text();
    assert.match(contractText,/Terms of Use and Training Safety/);
    assert.match(contractText,/Digital Course Cancellation and Refunds/);
   }
   assert.equal(receiptRequests,1);
   assert.deepEqual(errors,[]);
   console.log("PASS",width,paid?"own receipt printable":"unpaid receipt absent");
   await context.close();
  }
 }

 // Test the staged membership UI in memory only. Never change the checked-in release lock.
 const memberHtml=fs.readFileSync(path.join(root,"members.html"),"utf8");
 assert.ok(memberHtml.includes("const MEMBERSHIP_UI_RELEASE_APPROVED = false;"));
 // Capture only the final navigation; retain all real URL validation.
 assert.equal(memberHtml.split("location.assign(destination.href);").length,2);
 const simulatedRelease=memberHtml.replace("const MEMBERSHIP_UI_RELEASE_APPROVED = false;","const MEMBERSHIP_UI_RELEASE_APPROVED = true;").replace("location.assign(destination.href);","window.__verifiedMembershipDestination=destination.href;");
 for(const width of [390,1280])for(const membership of [false,true]){
  const context=await browser.newContext({viewport:{width,height:850}});
  let requests=[],hostile=true;
  await context.route("**/*",async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin===base&&url.pathname==="/members.html")return route.fulfill({contentType:"text/html",body:simulatedRelease});
   if(url.origin===base&&url.pathname==="/auth.js")return route.fulfill({contentType:"text/javascript",body:authFixture(false,membership)});
   if(url.origin===base)return route.continue();
   if(url.hostname==="fhyhshakmvqwzdyannec.supabase.co"){
    const headers={"access-control-allow-origin":"*","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS"};
    if(req.method()==="OPTIONS")return route.fulfill({status:204,headers});
    const endpoint=membership?"membership-live-portal":"membership-live-checkout";
    assert.equal(url.pathname,"/functions/v1/"+endpoint);
    requests.push(req.postDataJSON());
    const host=membership?"billing.stripe.com":"checkout.stripe.com";
    return route.fulfill({status:200,contentType:"application/json",headers,body:JSON.stringify({test_mode:false,url:hostile?"https://"+host+".example.invalid/fake":"https://"+host+"/fixture-no-real-session"})});
   }
   // Any outbound navigation is a test failure.
   throw Error("Unexpected network "+url.hostname);
  });
  await context.addInitScript(()=>localStorage.setItem("fobur_analytics_consent_v1","no"));
  const page=await context.newPage();
  await page.goto(base+"/members.html");
  await page.locator("#liveMembershipControls").waitFor({state:"visible"});
  const form=page.locator("#liveMembershipConsent"),manage=page.locator("#liveMembershipManage");
  assert.equal(await form.isVisible(),!membership);
  assert.equal(await manage.isVisible(),membership);
  const button=membership?manage:form.locator("button");
  if(!membership){
   assert.equal(await form.locator("input:checked").count(),0);
   await button.click();
   assert.equal(requests.length,0,"missing consent must not create checkout");
   for(const name of ["terms","renewal","cancel","immediate"])await form.locator("input[name="+name+"]").check();
  }
  await button.click();
  await page.waitForFunction(()=>document.querySelector("#liveMembershipMessage").textContent.includes("Unexpected payment destination"));
  assert.equal(requests.length,1);
  if(!membership)assert.deepEqual(requests[0],{terms_accepted:true,recurring_billing_consent:true,cancellation_acknowledgement:true,immediate_supply_requested:true,terms_version:"membership-2026-11-24-v1"});
  assert.equal(await page.evaluate(()=>window.__verifiedMembershipDestination),undefined);
  hostile=false;
  await button.click();
  const expectedDestination="https://"+(membership?"billing.stripe.com":"checkout.stripe.com")+"/fixture-no-real-session";
  await page.waitForFunction(expected=>window.__verifiedMembershipDestination===expected,expectedDestination);
  assert.equal(requests.length,2);
  console.log("PASS staged membership consent controls",width,membership?"portal, exact host":"checkout, explicit consent, exact host");
  await context.close();
 }
} finally {
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
console.log("PASS isolated mobile/desktop account and receipt flows; no live calls");

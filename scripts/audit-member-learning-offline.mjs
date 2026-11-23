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
function authFixture(paid){
 const row=paid?'[{course_id:"beginner-training-course"}]':'[]';
 return [
  'const u={id:"11111111-1111-4111-8111-111111111111",email:"qa@example.invalid",is_anonymous:false};',
  'function from(table){const q={select(){return q},eq(){return q},like(){return q},then(a,b){return Promise.resolve({data:table==="course_access"?'+row+':[],error:null}).then(a,b)}};return q}',
  'export const supabase={auth:{getUser:async()=>({data:{user:u},error:null}),getSession:async()=>({data:{session:{access_token:"fixture"}},error:null}),onAuthStateChange:()=>({}),signOut:async()=>({error:null})},',
  'from, rpc:async name=>name==="has_active_membership"?{data:false,error:null}:{data:[],error:null}};',
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
   if(paid)assert.match(await page.locator(".receipt").innerText(),/£9\.99/);
   assert.equal(receiptRequests,1);
   assert.deepEqual(errors,[]);
   console.log("PASS",width,paid?"own receipt printable":"unpaid receipt absent");
   await context.close();
  }
 }
} finally {
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
console.log("PASS isolated mobile/desktop account and receipt flows; no live calls");

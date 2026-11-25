/** CI-only public visitor/mobile smoke audit; no payments, uploads or production writes. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const pages=["index.html","courses.html","training-availability.html","free-hub.html","members.html","gallery.html","sponsors.html",
  "built-up-roofing.html","tile-slate-roofing.html","metal-sheet-roofing.html","liquid-applied-roofing.html"];
const categories=["built-up-roofing.html","tile-slate-roofing.html","metal-sheet-roofing.html","liquid-applied-roofing.html"];
const sponsorPages = ["sponsors.html", "sponsors-tile-slate-roofing.html", "sponsors-metal-sheet-roofing.html", "sponsors-liquid-applied-roofing.html"];
const galleryNames = ["Moonlit London", "Art Deco Onyx", "Emerald Atrium", "Copper Rooftop"];
const failures=[];
for(const file of pages){
 const html=fs.readFileSync(path.join(root,file),"utf8");
 for(const match of html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/g)){
   const raw=match[1].trim();
   if(!raw||raw.includes("${")||/^(?:https?:|mailto:|tel:|data:|blob:|javascript:|#|\/\/)/i.test(raw))continue;
   const target=decodeURIComponent(raw.split(/[?#]/)[0]);
   if(!target||target.startsWith("/functions")||target.startsWith("/api"))continue;
   if(target.startsWith("/"))continue;
   const location=path.resolve(path.dirname(path.join(root,file)),target);
   if(!location.startsWith(root+path.sep)||!fs.existsSync(location))failures.push("MISSING_FILE "+file+" -> "+target);
 }
}
for(const name of ["index.html",...categories]){
 const html=fs.readFileSync(path.join(root,name),"utf8");
 for(let i=1;i<=4;i++)if(!html.includes('href="#roof-panel-'+i+'"'))failures.push("MISSING_ORIGINAL_TAB "+name+" "+i);
 if(!html.includes("viewport-fit=cover"))failures.push("MISSING_MOBILE_VIEWPORT "+name);
 if(!html.includes('class="page-art"')||!html.includes('id="roof-panel-4"'))failures.push("MISSING_APPROVED_ARTWORK "+name);
 if(!html.includes("live-category-navigation"))failures.push("CLICKABLE_ARTWORK_LINKS_MISSING "+name);
 if(!html.includes("FOUR SPECIALIST ROOFING AREAS"))failures.push("WRONG_FOUR_PAGE_DESIGN "+name);
}
if(fs.readFileSync(path.join(root,"training-availability.html"),"utf8").includes("section is in preparation"))failures.push("STALE_AVAILABILITY");
if(failures.length)throw Error("Static public audit failures:\n"+failures.join("\n"));

const MIME={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".mjs":"text/javascript",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp4":"video/mp4",".json":"application/json"};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,"http://localhost");
 const target=path.resolve(root,"."+decodeURIComponent(url.pathname));
 if(!target.startsWith(root+path.sep) && target!==root){res.writeHead(403);res.end();return;}
 const resolved=target===root?path.join(root,"index.html"):target;
 fs.readFile(resolved,(err,data)=>{if(err){res.writeHead(404);res.end("Not found");return;}
 res.writeHead(200,{"content-type":MIME[path.extname(resolved)]||"application/octet-stream","cache-control":"no-store"});res.end(data);});
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 for(const width of [390,768,1024]){
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:width===390,hasTouch:width===390});
  for(const file of [...categories,"courses.html","training-availability.html"]){
   const page=await context.newPage();
   const errors=[];
   page.on("pageerror",err=>errors.push(err.message));
   const response=await page.goto("http://127.0.0.1:"+port+"/"+file,{waitUntil:"load"});
   if(response.status()!==200)failures.push("HTTP "+width+" "+file+" "+response.status());
   await page.waitForTimeout(120);
   const info=await page.evaluate(()=>({
     innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,
     title:document.title,
     navCount:document.querySelectorAll(".roof-tab").length,
     visible:document.body.getBoundingClientRect().height>300,
     tabLayout:(()=>{const tabs=[...document.querySelectorAll(".roof-tab")];const boxes=tabs.map(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,visible:!!(el.getClientRects().length&&getComputedStyle(el).visibility!=="hidden")}});return{orderedRow:boxes.every((box,i)=>Math.abs(box.top-boxes[0].top)<=1 && (i===0 || box.left>=boxes[i-1].right-1)),boxes,allVisible:boxes.length===4&&boxes.every(b=>b.visible&&b.width>=44&&b.height>=44),withinViewport:boxes.every(b=>b.left>=-1&&b.right<=innerWidth+1),noOverlap:boxes.every((a,i)=>boxes.slice(i+1).every(b=>a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1))}})(),
     image:[...document.querySelectorAll(".page-panel .page-art")].every(im=>im.complete&&im.naturalWidth>0)
   }));
   if(info.scrollWidth>info.innerWidth+3)failures.push("HORIZONTAL_OVERFLOW "+width+" "+file+" "+JSON.stringify(info));
   if(categories.includes(file)&&info.navCount!==4)failures.push("WRONG_NAV_COUNT "+width+" "+file+" "+info.navCount);
   if(categories.includes(file)&&width===390&&(!info.tabLayout.orderedRow||!info.tabLayout.allVisible||!info.tabLayout.withinViewport||!info.tabLayout.noOverlap))failures.push("MOBILE_TAB_LAYOUT_INVALID "+file+" "+JSON.stringify(info.tabLayout));
   if(!info.visible)failures.push("EMPTY_PAGE "+width+" "+file);
   if(!info.image)failures.push("MISSING_HERO_IMAGE "+width+" "+file);
   if(errors.length)failures.push("JS_EXCEPTION "+width+" "+file+" "+errors.join(" | "));
   if (categories.includes(file)) {
     const index = categories.indexOf(file);
     const panel = page.locator("#roof-panel-" + (index + 1));
     const sponsorLinks = panel.getByRole("link", {name: /sponsor/i});
     assert.equal(await sponsorLinks.count(), 3, file + " sponsor links");
     for (const link of await sponsorLinks.all()) {
       assert.equal(await link.getAttribute("href"), sponsorPages[index]);
     }
     await panel.getByRole("link", {name: "Sponsorship and brand exposure"}).click();
     await page.waitForURL("**/" + sponsorPages[index]);
     const artwork = page.getByRole("img", {name: new RegExp("^" + galleryNames[index])});
     await artwork.evaluate(image => image.decode());
     assert.ok(await artwork.evaluate(image => image.naturalWidth > 0 && image.getBoundingClientRect().right <= innerWidth + 1));
     await page.getByRole("button", {name:"Enlarge the sponsor enquiry QR code"}).click();
     const dialog = page.getByRole("dialog", {name:"Sponsor Enquiry"});
     await dialog.waitFor();
     await dialog.getByRole("img").evaluate(image => image.decode());
     await dialog.getByRole("button", {name:"Close", exact:true}).click();
     await dialog.waitFor({state:"hidden"});
     console.log("PASS_SPONSOR_GALLERY", width, file, galleryNames[index]);
   }
   console.log("PASS_VIEW",width,file,"scroll",info.scrollWidth,"nav",info.navCount);
   await page.close();
  }
  await context.close();
 }
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await ctx.newPage();
 await page.goto("http://127.0.0.1:"+port+"/courses.html");
 await page.getByRole("link",{name:"Explore Liquid Applied"}).click();
 await page.waitForURL("**/liquid-applied-roofing.html");
 await page.locator("#roof-panel-4 .page-art").waitFor({state:"visible"});
 assert.equal(await page.locator(".roof-tab").count(),4);
 await page.locator("#roof-tab-2").click();
 await page.locator("#roof-panel-2").waitFor({state:"visible"});
 await page.locator("#roof-tab-4").click();
 await page.locator("#roof-panel-4").waitFor({state:"visible"});
 const academy=page.locator('#roof-panel-4 .visual-hit[aria-label="Academy"]').first();
 await academy.click();
 await page.waitForURL("**/courses.html");
 console.log("PASS_NAVIGATION four original logo tabs, full artwork and academy hotspot");

 // Roofing Connect: verify the real enquiry code without opening a mail app or sending mail.
 const roofingKeys=["built-up","tile-slate","metal-sheet","liquid-applied"];
 for(const width of [390,768,1024]){
   const leadContext=await browser.newContext({viewport:{width,height:844}});
   // Intercept only the final external mailto navigation; run all other original code.
   await leadContext.route("**/roofing-connect.html*",async route=>{
     const response=await route.fetch();
     const original=await response.text();
     assert.ok(original.includes("location.href=uri;"));
     await route.fulfill({response,body:original.replace("location.href=uri;","window.__testMailto=uri;")});
   });
   await leadContext.addInitScript(()=>localStorage.setItem("fobur_analytics_consent_v1","no"));
   const lead=await leadContext.newPage();
   for(let i=0;i<sponsorPages.length;i++){
     await lead.goto("http://127.0.0.1:"+port+"/"+sponsorPages[i]);
     await lead.locator(".rc-entry a").click();
     await lead.waitForURL("**/roofing-connect.html?roof="+roofingKeys[i]+"#enquiry");
     assert.equal(await lead.locator("#rc-roof").inputValue(),roofingKeys[i]);
     assert.ok((await lead.locator("#rc-source").textContent()).includes("sponsor gallery"));
     assert.ok(await lead.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3));
     await lead.locator("#rc-area").fill("INVALID");
     await lead.locator("#rc-submit").click();
     assert.equal(await lead.evaluate(()=>window.__testMailto),undefined);
     await lead.locator("#rc-area").fill("PO9");
     await lead.locator("#rc-detail").fill("TEST ONLY — synthetic project, no customer data.");
     await lead.locator("#rc-submit").click();
     const draft=await lead.evaluate(()=>window.__testMailto);
     const uri=new URL(draft);
     assert.equal(uri.protocol,"mailto:");
     assert.equal(uri.pathname,"flatoutbuiltuproofing@gmail.com");
     assert.equal(uri.searchParams.get("subject"),"Roofing Connect project enquiry");
     assert.ok(uri.searchParams.get("body").includes("Postcode area: PO9"));
     assert.ok(uri.searchParams.get("body").includes("Enquiry source:"));
     assert.ok(uri.searchParams.get("body").includes("Ask me before sharing"));
     assert.ok(await lead.locator("#rc-result").isVisible());
     assert.equal(await lead.locator("#rc-partner option").nth(1).evaluate(option=>option.disabled),i!==0,"native sponsor option disabled state");
     if(i!==0)assert.equal(await lead.locator("#rc-partner").inputValue(),"");
     console.log("PASS_ROOFING_CONNECT",width,roofingKeys[i],"draft intercepted; no mail sent");
   }
   await lead.goto("http://127.0.0.1:"+port+"/gallery.html");
   await lead.locator(".rc-entry a").click();
   await lead.waitForURL("**/roofing-connect.html#enquiry");
   assert.equal(await lead.locator("#rc-source").textContent(),"From: Project gallery");
   await lead.locator("#rc-select-tmc").click();
   assert.equal(await lead.locator("#rc-partner").inputValue(),"TMC Roofing");
   console.log("PASS_ROOFING_CONNECT_GALLERY",width);
   await leadContext.close();
 }
 await ctx.close();
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
if(failures.length)throw Error("Browser audit FAILED:\n"+failures.join("\n"));
console.log("PUBLIC LAUNCH QA PASSED",pages.length,"static pages, four-way category routes, mobile/desktop views, interactive check. No payment made.");

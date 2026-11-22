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
for(const name of categories){
 const html=fs.readFileSync(path.join(root,name),"utf8");
 for(const link of categories){
  if(!html.includes('href="'+link+'"'))failures.push("MISSING_FOURTH_TAB "+name+" -> "+link);
 }
 if(!html.includes('specialty-mobile.css'))failures.push("MOBILE_STYLES_NOT_LINKED "+name);
}
const liquid=fs.readFileSync(path.join(root,"liquid-applied-roofing.html"),"utf8");
if((liquid.match(/class="liquid-module"/g)||[]).length!==6)failures.push("LIQUID_MODULE_COUNT");
if(!liquid.includes("ANIMATED ROOF SYSTEM CUTAWAY")||!liquid.includes("NOT SITE FOOTAGE"))failures.push("ILLUSTRATION_DISCLOSURE");
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
     navCount:document.querySelectorAll(".branch-nav a").length,
     visible:document.body.getBoundingClientRect().height>300,
     grid:getComputedStyle(document.querySelector(".branch-nav")||document.body).display,
     image:document.querySelector(".hero-visual img")?.complete!==false
   }));
   if(info.scrollWidth>info.innerWidth+3)failures.push("HORIZONTAL_OVERFLOW "+width+" "+file+" "+JSON.stringify(info));
   if(categories.includes(file)&&info.navCount!==5)failures.push("WRONG_NAV_COUNT "+width+" "+file+" "+info.navCount);
   if(categories.includes(file)&&width===390&&info.grid!=="grid")failures.push("MOBILE_NAV_NOT_GRID "+file);
   if(!info.visible)failures.push("EMPTY_PAGE "+width+" "+file);
   if(!info.image)failures.push("MISSING_HERO_IMAGE "+width+" "+file);
   if(errors.length)failures.push("JS_EXCEPTION "+width+" "+file+" "+errors.join(" | "));
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
 await page.locator(".liquid-learning details summary").click();
 await page.locator('input[name="liquidquiz"][value="b"]').check();
 await page.getByRole("button",{name:"Check answer"}).click();
 assert.match(await page.locator("#liquid-result").innerText(),/^Correct/);
 await page.getByRole("link",{name:"Tile & Slate",exact:true}).first().click();
 await page.waitForURL("**/tile-slate-roofing.html");
 await page.getByRole("link",{name:"Liquid Applied",exact:true}).first().click();
 await page.waitForURL("**/liquid-applied-roofing.html");
 console.log("PASS_NAVIGATION four-way category navigation and Liquid Applied knowledge check");
 await ctx.close();
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
if(failures.length)throw Error("Browser audit FAILED:\n"+failures.join("\n"));
console.log("PUBLIC LAUNCH QA PASSED",pages.length,"static pages, four-way category routes, mobile/desktop views, interactive check. No payment made.");

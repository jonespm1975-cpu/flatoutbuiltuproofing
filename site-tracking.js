// Flat Out Built-Up Roofing: voluntary first-party analytics (no advertising pixels).
// No tracking, visitor identifier or acquisition storage until analytics opt-in.
(function(){
"use strict";
const API="https://fhyhshakmvqwzdyannec.supabase.co/functions/v1/site-analytics";
const CONSENT="fobur_analytics_consent_v1", VISITOR="fobur_visitor_session_v2", ATTR="fobur_session_source_v1";
// Exclude the owner on each browser after an authenticated owner sign-in.
const OWNER_EXCLUDE="fobur_owner_device_excluded_v1";
const OWNER_ID="87fca075-224a-4379-bafb-3a01e41890f4";
const AUTH_STORAGE="sb-fhyhshakmvqwzdyannec-auth-token";
const blocked=navigator.globalPrivacyControl===true||navigator.doNotTrack==="1";
const read=(store,key)=>{try{return store.getItem(key)}catch{return null}};
const write=(store,key,val)=>{try{store.setItem(key,val)}catch{}};
const remove=(store,key)=>{try{store.removeItem(key)}catch{}};
const clean=(v,max)=>{const t=String(v||"").toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,max);return t||null};
const params=new URL(location.href).searchParams;
const device=/iPad|Tablet/i.test(navigator.userAgent)?"Tablet":/Mobi|iPhone|Android/i.test(navigator.userAgent)?"Mobile":"Desktop";
const page=location.pathname.replace(/\/+/g,"/")||"/";
const courseLinks=new Set(["/courses.html","/tapered-insulation.html","/purchase-info.html","/built-up-roofing.html","/tapered-video-academy.html"]);
let sent=false;
function ownerDevice(){return read(localStorage,OWNER_EXCLUDE)==="yes";}
function opted(){return !blocked&&!ownerDevice()&&read(localStorage,CONSENT)==="yes";}
// No personal identity is sent to analytics; owner detection only decides
// whether to suppress voluntary tracking on this browser. The local marker
// also protects owner browsing after sign-out.
async function isOwnerVisit(){
 if(ownerDevice())return true;
 // Avoid loading Auth on every public page when no Supabase session exists.
 if(!read(localStorage,AUTH_STORAGE))return false;
 try{
  const {supabase}=await import('/auth.js');
  const {data:{user},error}=await supabase.auth.getUser();
  if(!error&&user?.id===OWNER_ID&&user.email?.toLowerCase()==='jonespm1975@gmail.com'){
   write(localStorage,OWNER_EXCLUDE,"yes");
   hide();
   return true;
  }
 }catch{} // Normal consented traffic still works if Auth is unavailable.
 return false;
}
function attribution(){
 // First-touch source within a consented browser-tab session. No raw URLs or PII.
 const saved=read(sessionStorage,ATTR);
 const medium=clean(params.get("utm_medium"),32),tag=clean(params.get("utm_source"),48);
 const rawCampaign=clean(params.get("utm_campaign"),64);
 const campaign=rawCampaign&&/^(?:qr|fobur|social|search|sponsor|course|homepage|site|promo)_[a-z0-9_-]{1,56}$/.test(rawCampaign)?rawCampaign:tag?.startsWith("qr_")&&/^qr_[a-z0-9_-]{1,56}$/.test(tag)?tag:null;
 if(saved){try{const prior=JSON.parse(saved);if(prior&&prior.source_category)return prior}catch{}}
 let host="";try{host=new URL(document.referrer).hostname.toLowerCase().replace(/^www\./,"")}catch{}
 const own=location.hostname.toLowerCase().replace(/^www\./,"");
 if(host===own)host="";
 const searchHosts=/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.[a-z.]+)$/;
 const socialHosts=/(^|\.)(instagram\.com|facebook\.com|tiktok\.com|linkedin\.com|youtube\.com|pinterest\.com|twitter\.com|x\.com|t\.co)$/;
 const searchTags=["google","bing","duckduckgo","yahoo"];
 const socialTags=["instagram","facebook","tiktok","linkedin","youtube","pinterest","twitter","x","threads"];
 let category="Direct",detail=null;
 if(medium==="qr"||tag==="qr"||tag?.startsWith("qr_")||campaign?.startsWith("qr_"))category="QR";
 else if(["organic","search","paid_search","cpc","ppc"].includes(medium)||searchTags.includes(tag)||searchHosts.test(host)||campaign?.startsWith("search_"))category="Search";
 else if(["social","paid_social","social_media"].includes(medium)||socialTags.includes(tag)||socialHosts.test(host)||campaign?.startsWith("social_"))category="Social";
 else if(medium||tag||host)category="Referral";
 if(category==="QR")detail="qr";
 else if(category==="Search")detail=searchTags.find(x=>tag===x||host.includes(x))||"search";
 else if(category==="Social")detail=socialTags.find(x=>tag===x||host.includes(x))||"social";
 else if(category==="Referral")detail="external";
 const value={source_category:category,source_detail:detail,campaign};
 write(sessionStorage,ATTR,JSON.stringify(value));return value;
}
function visitor(){
 let v=read(sessionStorage,VISITOR);
 if(!v){v=crypto.randomUUID();write(sessionStorage,VISITOR,v)}
 return v;
}
async function record(kind,path){
 if(!opted()||!/^\/[a-zA-Z0-9/_.-]{0,119}$/.test(path))return;
 if(await isOwnerVisit()||!opted())return;
 const payload={consent:true,event_kind:kind,page:path,visitor:visitor(),device,...attribution()};
 fetch(API,{method:"POST",mode:"cors",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),keepalive:true,cache:"no-store"}).catch(()=>{});
}
function pageView(){if(!sent){sent=true;record("page_view",page);}}
document.addEventListener("click",event=>{
 if(!opted())return;
 const a=event.target.closest?.("a[href]");if(!a)return;
 try{
  const u=new URL(a.href,location.href);
  if(u.origin!==location.origin||!courseLinks.has(u.pathname))return;
  // Course CTAs only: ordinary menu navigation is a page view, not purchase intent.
  const marked=a.hasAttribute("data-course-interest");
  const cardCTA=a.classList.contains("btn")&&Boolean(a.closest(".card, .academy-feature"));
  const homeCTA=(page==="/"||page==="/index.html")&&a.classList.contains("hotspot")&&
    ["paid-top","specialist-course","feature-academy"].some(x=>a.classList.contains(x));
  if(marked||cardCTA||homeCTA)record("course_interest",u.pathname);
 }catch{}
},{capture:true});
let notice;
function hide(){notice?.remove();notice=null;}
function choose(value){
 write(localStorage,CONSENT,value);
 hide();
 if(value==="yes"&&!blocked)pageView();
 else {remove(sessionStorage,VISITOR);remove(sessionStorage,ATTR);}
}
function show(){
 if(notice||blocked||ownerDevice())return;
 notice=document.createElement("section");
 notice.setAttribute("role","region");notice.setAttribute("aria-label","Optional analytics preferences");
 notice.style.cssText="position:fixed;z-index:2147483000;left:12px;right:12px;bottom:12px;max-width:600px;margin:auto;background:#101016;color:#fff4d7;border:1px solid #d9b453;border-radius:14px;padding:15px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 7px 32px #000c";
 const lead=document.createElement("p");lead.style.margin="0 0 10px";lead.textContent="Optional site analytics: may we count your page visits and course-link clicks, including where you arrived from (QR, search or social)? We use a short-lived session identifier and do not share it with advertisers.";
 const links=document.createElement("p");links.style.margin="0 0 12px";
 const privacy=document.createElement("a");privacy.href="/privacy.html";privacy.textContent="Privacy details";privacy.style.color="#ffe08b";
 links.append(privacy);
 const buttons=document.createElement("div");buttons.style.cssText="display:flex;gap:10px;flex-wrap:wrap";
 for(const [label,value] of [["Reject optional analytics","no"],["Allow optional analytics","yes"]]){
  const b=document.createElement("button");b.type="button";b.textContent=label;b.style.cssText="flex:1 1 170px;padding:9px 10px;background:#292122;color:#ffe8b0;border:1px solid #d9b453;border-radius:8px;font:inherit;cursor:pointer";
  b.addEventListener("click",()=>choose(value));buttons.append(b);
 }
 notice.append(lead,links,buttons);document.body.append(notice);
}
window.foburOpenAnalyticsPreferences=()=>{remove(localStorage,CONSENT);sent=false;show();};
// Check owner status before the initial page view, so signed-in owner visits
// never increment public visitor statistics.
(async()=>{if(await isOwnerVisit())return;if(opted())pageView();else if(read(localStorage,CONSENT)!=="no"&&!blocked)show();})();
})();
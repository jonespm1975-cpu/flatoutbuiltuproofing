// Flat Out Built-Up Roofing: voluntary first-party analytics (no advertising pixels).
// No tracking, visitor identifier or acquisition storage until analytics opt-in.
(function(){
"use strict";
const API="https://fhyhshakmvqwzdyannec.supabase.co/functions/v1/site-analytics";
const CONSENT="fobur_analytics_consent_v1", VISITOR="fobur_visitor_session_v2", ATTR="fobur_session_source_v1";
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
function opted(){return !blocked&&read(localStorage,CONSENT)==="yes";}
function attribution(){
 const saved=read(sessionStorage,ATTR),medium=clean(params.get("utm_medium"),32),tag=clean(params.get("utm_source"),48),campaign=clean(params.get("utm_campaign"),64);
 const tagged=Boolean(medium||tag||campaign);
 if(!tagged&&saved){try{return JSON.parse(saved)}catch{}}
 let host="";try{host=new URL(document.referrer).hostname.toLowerCase()}catch{}
 const social=/^(instagram\.com|www\.instagram\.com|facebook\.com|www\.facebook\.com|m\.facebook\.com|l\.facebook\.com|t\.co|twitter\.com|x\.com|www\.tiktok\.com|tiktok\.com|linkedin\.com|www\.linkedin\.com|youtube\.com|www\.youtube\.com|pinterest\.com|www\.pinterest\.com)$/;
 const search=/(^|\.)google\.|(^|\.)bing\.com$|(^|\.)duckduckgo\.com$|(^|\.)yahoo\./;
 let category="Direct",detail=tag||null;
 if(medium==="qr"||tag==="qr"||tag?.startsWith("qr_"))category="QR";
 else if(medium==="organic"||medium==="search"||medium==="cpc"||search.test(tag||"")||search.test(host))category="Search";
 else if(["social","paid_social","social_media"].includes(medium||"")||social.test(tag||"")||social.test(host))category="Social";
 else if(medium||tag)category="Referral";
 else if(host&&host!==location.hostname&&host!=="www."+location.hostname)category="Referral";
 if(!detail){if(category==="Search")detail=host.includes("bing")?"bing":host.includes("google")?"google":"search";
 else if(category==="Social")detail=host.includes("instagram")?"instagram":host.includes("facebook")?"facebook":host.includes("tiktok")?"tiktok":"social";}
 const a={source_category:category,source_detail:detail,campaign};
 write(sessionStorage,ATTR,JSON.stringify(a));return a;
}
function visitor(){
 let v=read(sessionStorage,VISITOR);
 if(!v){v=crypto.randomUUID();write(sessionStorage,VISITOR,v)}
 return v;
}
function record(kind,path){
 if(!opted()||!/^\/[a-zA-Z0-9/_.-]{0,119}$/.test(path))return;
 const payload={consent:true,event_kind:kind,page:path,visitor:visitor(),device,...attribution()};
 fetch(API,{method:"POST",mode:"cors",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),keepalive:true,cache:"no-store"}).catch(()=>{});
}
function pageView(){if(!sent){sent=true;record("page_view",page);}}
document.addEventListener("click",event=>{
 if(!opted())return;
 const a=event.target.closest?.("a[href]");if(!a)return;
 try{const u=new URL(a.href,location.href);if(u.origin===location.origin&&courseLinks.has(u.pathname))record("course_interest",u.pathname)}catch{}
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
 if(notice||blocked)return;
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
if(opted())pageView();else if(read(localStorage,CONSENT)!=="no"&&!blocked)show();
})();
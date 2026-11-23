// Read-only public DNS readiness report for a Postmark cutover.
// Safe for CI; no Postmark account access, credentials, DNS writes or emails.
const domain="flatoutbuiltuproofing.co.uk";
const names=[
  {label:"Authoritative nameservers",name:domain,type:"NS"},
  {label:"Website alias",name:"www."+domain,type:"CNAME"},
  {label:"Existing inbound mail routing",name:domain,type:"MX"},
  {label:"SPF TXT records",name:domain,type:"TXT"},
  {label:"DMARC TXT record",name:"_dmarc."+domain,type:"TXT"},
  {label:"Postmark custom Return-Path candidate",name:"pm_bounces."+domain,type:"CNAME"},
  {label:"Alternative Postmark Return-Path label",name:"pm-bounces."+domain,type:"CNAME"}
];

async function dns(name,type){
 const resolvers=[
   "https://dns.google/resolve",
   "https://cloudflare-dns.com/dns-query"
 ];
 for(const url of resolvers){
  try{
   const response=await fetch(url+"?name="+encodeURIComponent(name)+"&type="+type,
     {headers:{Accept:"application/dns-json"},signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error("Resolver HTTP "+response.status);
   const payload=await response.json();
   if(typeof payload.Status!=="number")throw Error("Invalid response");
   return {status:payload.Status,answers:(payload.Answer||[])
     .filter(a=>a.type===({NS:2,CNAME:5,MX:15,TXT:16}[type])),resolver:new URL(url).hostname};
  }catch(err){
   console.log("Resolver unavailable",new URL(url).hostname,err.message);
  }
 }
 throw new Error("Both public DNS resolvers unavailable for "+name+" "+type);
}
const report={domain,checked_at:new Date().toISOString(),results:{}};
let unavailable=0;
for(const item of names){
 try{
  const value=await dns(item.name,item.type);
  const records=value.answers.map(a=>a.data.replace(/^"|"$/g,""));
  // Avoid printing unrelated DNS verification tokens from public TXT entries.
  const summarized=item.type==="TXT" ?
     records.map(x=>x.startsWith("v=spf1")||x.startsWith("v=DMARC1")?x:"[other public TXT record redacted]") :
     records;
  report.results[item.label]={name:item.name,type:item.type,published:records.length>0,
    values:summarized,status:value.status,resolver:value.resolver};
  console.log(item.label+":",records.length?summarized.join(" | "):"not published",
    "[resolver "+value.resolver+"; DNS status "+value.status+"]");
 }catch(e){
  unavailable++;
  report.results[item.label]={error:String(e.message)};
  console.log(item.label+": unable to verify, not evidence of missing DNS");
 }
}
const spf=report.results["SPF TXT records"]?.values||[];
const realSpf=spf.filter(x=>x.startsWith("v=spf1"));
if(realSpf.length>1){
 console.error("FAIL: multiple SPF TXT records detected");
 process.exitCode=1;
}else console.log("CHECK SPF records:",realSpf.length,"(do not replace existing mail settings)");
const dmarc=report.results["DMARC TXT record"]?.values||[];
console.log("CHECK DMARC:",dmarc.some(x=>x.startsWith("v=DMARC1"))?"published":"not verified/published");
const candidates=["Postmark custom Return-Path candidate","Alternative Postmark Return-Path label"];
for(const k of candidates){
 const result=report.results[k],values=result?.values||[];
 if(values.length){
  const pm=values.some(x=>x.replace(/\.$/,"").toLowerCase()==="pm.mtasv.net");
  console.log("CHECK "+k+":",pm?"points to Postmark":"published but different destination; inspect before editing");
 }else console.log("CHECK "+k+": no CNAME confirmed");
}
console.log("IMPORTANT: Postmark DKIM TXT uses an ACCOUNT-GENERATED hostname and value,");
console.log("so DKIM and sender-domain verification cannot be asserted without the Postmark DNS settings.");
if(unavailable){
 console.warn("WARNING",unavailable,"public DNS checks unavailable; do not infer non-existence");
 // DNS transport failure should be surfaced as a failure, not a false clean bill of health.
 if(unavailable===names.length)process.exitCode=1;
}
console.log("END public DNS read-only readiness report — no credentials, changes or mail sent.");

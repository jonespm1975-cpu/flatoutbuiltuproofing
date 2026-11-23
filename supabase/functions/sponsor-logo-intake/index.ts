import { createClient } from "npm:@supabase/supabase-js@2.49.4";
const ORIGIN="https://flatoutbuiltuproofing.co.uk";
const HEADERS={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin"};
const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
const allowed=new Set(["image/jpeg","image/png","image/webp"]);
async function sha256Hex(value:string){
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function validImage(b:Uint8Array,m:string){
 if(m==="image/jpeg")return b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
 if(m==="image/png")return b.length>=8&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10;
 if(m==="image/webp")return b.length>=12&&String.fromCharCode(...b.slice(0,4))==="RIFF"&&String.fromCharCode(...b.slice(8,12))==="WEBP";
 return false;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 if(origin&&origin!==ORIGIN)return json(403,{error:"This upload form is only available from the official site."});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:HEADERS});
 if(req.method!=="POST")return json(405,{error:"Method not allowed."});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return json(503,{error:"Sponsor upload service unavailable."});
 let form:FormData;try{form=await req.formData();}catch{return json(400,{error:"Complete the logo submission form."});}
 const token=String(form.get("invite")||"");
 if(token.length<32||token.length>128)return json(403,{error:"This sponsor invitation is missing or invalid."});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const tokenHash=await sha256Hex(token);
 const {data:invite,error:inviteError}=await admin.from("sponsor_upload_invites").select("id,enabled,submission_count,max_submissions").eq("token_hash",tokenHash).maybeSingle();
 if(inviteError)return json(503,{error:"Sponsor invitation could not be checked."});
 if(!invite||!invite.enabled)return json(403,{error:"This sponsor invitation is no longer active."});
 if(invite.submission_count>=invite.max_submissions)return json(429,{error:"This sponsor invitation has reached its submission limit."});
 if(String(form.get("approval")||"")!=="yes")return json(400,{error:"Confirm that you are authorised to submit this logo."});
 const company=String(form.get("company")||"").trim();
 const email=String(form.get("email")||"").trim().toLowerCase();
 const description=String(form.get("description")||"").trim();
 let website=String(form.get("website")||"").trim();
 if(company.length<1||company.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||description.length<1||description.length>160)
   return json(400,{error:"Enter a company name, valid email and description under 160 characters."});
 if(website){try{const w=new URL(website);if(w.protocol!=="https:")return json(400,{error:"Website links must use HTTPS."});website=w.toString();}catch{return json(400,{error:"Enter a valid HTTPS website, or leave it blank."});}}
 const {data:duplicate,error:duplicateError}=await admin.from("sponsor_logo_submissions").select("id")
   .eq("invite_id",invite.id).eq("contact_email",email).in("status",["pending","approved"]).limit(1);
 if(duplicateError)return json(503,{error:"Sponsor submission status could not be checked."});
 if(duplicate?.length)return json(409,{error:"A logo has already been submitted for this company email. Contact the owner if you need to replace it."});
 const logo=form.get("logo");
 if(!(logo instanceof File)||!allowed.has(logo.type)||logo.size<1||logo.size>3*1024*1024)
   return json(400,{error:"Choose one JPEG, PNG or WebP logo up to 3 MB."});
 const bytes=new Uint8Array(await logo.arrayBuffer());
 if(!validImage(bytes,logo.type))return json(400,{error:"The selected file is not a valid image."});
 const ext=logo.type==="image/jpeg"?"jpg":logo.type==="image/png"?"png":"webp";
 const id=crypto.randomUUID(),path=invite.id+"/"+id+"."+ext;
 const {error:uploadError}=await admin.storage.from("sponsor-logos").upload(path,bytes,{contentType:logo.type,cacheControl:"3600",upsert:false});
 if(uploadError)return json(503,{error:"The logo could not be stored. Please try again."});
 const {error:insertError}=await admin.from("sponsor_logo_submissions").insert({id,invite_id:invite.id,company_name:company,contact_email:email,website:website||null,description,object_path:path,mime_type:logo.type,status:"pending"});
 if(insertError){await admin.storage.from("sponsor-logos").remove([path]);return json(503,{error:"The submission could not be queued for owner review."});}
 const {data:claimed,error:countError}=await admin.from("sponsor_upload_invites").update({submission_count:invite.submission_count+1}).eq("id",invite.id).eq("submission_count",invite.submission_count).lt("submission_count",invite.max_submissions).select("id").maybeSingle();
 if(countError||!claimed){
   await admin.from("sponsor_logo_submissions").delete().eq("id",id);
   await admin.storage.from("sponsor-logos").remove([path]);
   return countError?json(503,{error:"The invitation limit could not be verified. Please retry."}):json(429,{error:"This sponsor invitation has reached its submission limit."});
 }
 // The owner has retired the previous email provider. No emails are sent here.
 // Preserve the uploaded logo and its private pending-approval database record.
 // owner_notification_status retains its safe default 'pending' until a new,
 // explicitly approved notification service is integrated.
 return json(201,{accepted:true,status:"pending",ownerNotified:false,
   message:"Your logo has been received and is awaiting owner approval. It will not appear on the wall until approved."});
});

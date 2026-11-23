import {createClient} from "npm:@supabase/supabase-js@2.49.4";
const origin="https://flatoutbuiltuproofing.co.uk";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"GET,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="GET")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers});
 if(req.headers.get("origin")!==origin)return new Response(JSON.stringify({error:"Forbidden"}),{status:403,headers});
 const bearer=req.headers.get("authorization")||"";
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!bearer.startsWith("Bearer ")||!url||!anon||!service)return new Response(JSON.stringify({error:"Unavailable or unauthorised"}),{status:401,headers});
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(bearer.slice(7));
 if(error||!data.user||data.user.is_anonymous)return new Response(JSON.stringify({error:"Please sign in"}),{status:401,headers});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:records,error:readError}=await admin.from("purchase_confirmations").select("stripe_checkout_session_id,course_id,paid_amount_pence,currency,consent_recorded_at,confirmed_at,terms_version").eq("user_id",data.user.id).order("confirmed_at",{ascending:false}).limit(20);
 if(readError)return new Response(JSON.stringify({error:"Confirmation unavailable"}),{status:503,headers});
 return new Response(JSON.stringify({customer_email:data.user.email,records}),{status:200,headers});
});
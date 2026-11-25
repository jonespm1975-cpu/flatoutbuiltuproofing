// Offline verification of the proposed callback routing; no provider requests.
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), ts=require('typescript');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync('proposals/membership-confirmation-delivery-webhook.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(options={}){
 let handler;const calls=[];
 const env={FUTURE_CONFIRMATION_WEBHOOK_USER:'fixture-user',FUTURE_CONFIRMATION_WEBHOOK_PASSWORD:'fixture-pass',FUTURE_CONFIRMATION_WEBHOOK_ENABLED:'true',FUTURE_CONFIRMATION_POSTMARK_SERVER_ID:'123',SUPABASE_SERVICE_ROLE_KEY:'fixture-key',SUPABASE_URL:'https://fixture.invalid',...options.env};
 vm.runInNewContext(code,{exports:{},require:n=>{assert.equal(n,'npm:@supabase/supabase-js@2.49.4');return {createClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:!options.unmatched,error:options.unmatched?{code:'fixture'}:null}}})}},Deno:{serve:f=>handler=f,env:{get:k=>env[k]}},Request,Response,TextEncoder,Uint8Array,crypto:webcrypto,Date,atob,JSON},{timeout:2000});
 const defaults={RecordType:'Delivery',Tag:'membership-contract-confirmation',MessageStream:'outbound',MessageID:'fixture-id',ServerID:123,Recipient:'customer@fixture.invalid',DeliveredAt:'2026-11-25T12:00:00Z'};
 return {calls,run:async(change={},headers={},method='POST',raw)=>handler(new Request('https://fixture.invalid',{method,headers:{Authorization:'Basic '+Buffer.from('fixture-user:fixture-pass').toString('base64'),...headers},...(method==='POST'?{body:raw??JSON.stringify({...defaults,...change})}:{})}))};
}
async function check(label,{opts={},change={},headers={},method='POST',raw,status=200,rpc=null,kind}={}){
 const h=fixture(opts);const response=await h.run(change,headers,method,raw);assert.equal(response.status,status,label+': '+await response.text());
 assert.equal(h.calls.length,rpc?1:0,label);if(rpc){assert.equal(h.calls[0].name,rpc);if(kind)assert.equal(h.calls[0].args.p_event,kind);}
 console.log('PASS',label);
}
(async()=>{
 const member='record_membership_confirmation_delivery',course='record_future_contract_delivery';
 await check('membership delivery routes only to membership RPC',{rpc:member,kind:'delivered'});
 await check('membership bounce routes only to membership RPC',{change:{RecordType:'Bounce',Email:'customer@fixture.invalid',BouncedAt:'2026-11-25T12:00:00Z'},rpc:member,kind:'bounced'});
 await check('course delivery route unchanged',{change:{Tag:'one-off-course-contract-confirmation'},rpc:course,kind:'delivered'});
 await check('owner test route unchanged',{change:{Tag:'fobur-owner-delivery-check',Recipient:'flatoutbuiltuproofing@gmail.com'},rpc:'postmark_owner_check_event'});
 await check('sandbox receipt route unchanged',{change:{Tag:'fobur-owner-sandbox-receipt',Recipient:'flatoutbuiltuproofing@gmail.com'},rpc:'record_owner_sandbox_receipt_event'});
 await check('owner callback wrong recipient ignored',{change:{Tag:'fobur-owner-delivery-check'}});
 await check('missing authorization refused',{headers:{Authorization:''},status:401});
 await check('incorrect password refused',{headers:{Authorization:'Basic '+Buffer.from('fixture-user:wrong').toString('base64')},status:401});
 await check('disabled webhook refuses events',{opts:{env:{FUTURE_CONFIRMATION_WEBHOOK_ENABLED:'false'}},status:503});
 await check('missing server configuration refused',{opts:{env:{FUTURE_CONFIRMATION_POSTMARK_SERVER_ID:''}},status:503});
 await check('incorrect server ignored',{change:{ServerID:124}});
 await check('wrong stream ignored',{change:{MessageStream:'other'}});
 await check('unsupported tag ignored',{change:{Tag:'unknown'}});
 await check('invalid recipient refused',{change:{Recipient:'invalid'},status:422});
 await check('invalid timestamp refused',{change:{DeliveredAt:'invalid'},status:422});
 await check('malformed JSON refused',{raw:'{',status:400});
 await check('oversized payload refused',{raw:'x'.repeat(20001),status:413});
 await check('wrong method refused',{method:'GET',status:405});
 await check('unknown message retried for reconciliation',{opts:{unmatched:true},status:503,rpc:member,kind:'delivered'});
 console.log('ALL OFFLINE DELIVERY ROUTING TESTS PASSED');
})().catch(e=>{console.error(e);process.exitCode=1});

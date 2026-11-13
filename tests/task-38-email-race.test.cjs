// Offline deterministic concurrency probe for webhook's read-status -> send -> mark-status pattern.
// This is a race reproduction, not execution of deployed Edge Function code.
const assert=require('node:assert/strict');
async function main(){
 let status='pending', sends=0, idempotencyKeys=[];
 let release;const barrier=new Promise(resolve=>release=resolve);
 let readers=0;
 async function webhook(){
   const observed=status;
   readers++;
   if(readers===2)release();
   await barrier;
   if(observed!=='sent'){
     sends++;
     idempotencyKeys.push('sandbox-course-confirmation-cs_test_mock');
     status='sent';
   }
 }
 await Promise.all([webhook(),webhook()]);
 assert.equal(sends,2,'both deliveries attempt provider send without an atomic claim');
 assert.equal(new Set(idempotencyKeys).size,1,'provider key is stable, but is not a DB lock');
 console.log('PASS race reproduction: two concurrent webhook handlers can both attempt email send; same provider idempotency key');
 let claim=false, guardedSends=0;
 await Promise.all([0,1].map(async()=>{if(!claim){claim=true;guardedSends++}}));
 assert.equal(guardedSends,1);
 console.log('PASS isolated guard-model: atomic claim permits only one send attempt');
}
main().catch(e=>{console.error(e);process.exitCode=1});

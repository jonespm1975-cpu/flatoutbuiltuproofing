// Server-only payment risk check. No entitlement mutation and no live/test crossover.
export function classifySpecialistPayment(input:any){
 if(input.sessionPaid!==true||input.intentSucceeded!==true||input.chargeCaptured!==true||input.chargePaid!==true||input.currency!=="gbp"||input.amount!==999)return "not_paid";
 if(!Number.isInteger(input.refunded)||input.refunded<0||input.refunded>999||!Number.isInteger(input.pending)||input.pending<0||!Array.isArray(input.disputes))return "review";
 if(input.refunded>=999)return "refunded";
 if(input.disputes.some((s:string)=>s==="lost"))return "dispute_lost";
 if(input.disputes.some((s:string)=>!["won","warning_closed"].includes(s)))return "dispute_review";
 if(input.pending>0&&input.pending+input.refunded>=999)return "refund_pending";
 return input.refunded>0?"partial_refund_active":"active";
}
export async function readSpecialistPaymentRisk(stripe:any,session:any,expectedLive:boolean){
 const intentId=typeof session.payment_intent==="string"?session.payment_intent:session.payment_intent?.id;
 if(session.livemode!==expectedLive||session.mode!=="payment"||session.status!=="complete"||session.payment_status!=="paid"||session.currency!=="gbp"||session.amount_total!==999||!intentId)return "not_paid";
 const intent=await stripe.paymentIntents.retrieve(intentId,{expand:["latest_charge"]});
 const charge=intent.latest_charge;
 if(intent.livemode!==expectedLive||!charge||typeof charge==="string"||charge.livemode!==expectedLive||charge.payment_intent!==intent.id||intent.currency!=="gbp"||intent.amount_received!==999||charge.currency!=="gbp"||charge.amount!==999)return "review";
 const [refunds,disputes]=await Promise.all([stripe.refunds.list({charge:charge.id,limit:100}),stripe.disputes.list({charge:charge.id,limit:100})]);
 if(refunds.has_more||disputes.has_more||!Array.isArray(refunds.data)||!Array.isArray(disputes.data))return "review";
 if(refunds.data.some((r:any)=>r.charge!==charge.id||r.currency!=="gbp"||!Number.isInteger(r.amount)||r.amount<0||!["succeeded","pending","requires_action","failed","canceled"].includes(r.status)))return "review";
 if(disputes.data.some((d:any)=>d.charge!==charge.id||typeof d.status!=="string"))return "review";
 const refunded=refunds.data.filter((r:any)=>r.status==="succeeded").reduce((a:number,r:any)=>a+r.amount,0);
 const pending=refunds.data.filter((r:any)=>["pending","requires_action"].includes(r.status)).reduce((a:number,r:any)=>a+r.amount,0);
 if(charge.refunded&&refunded<999)return "review";
 if(charge.disputed&&disputes.data.length===0)return "review";
 return classifySpecialistPayment({sessionPaid:true,intentSucceeded:intent.status==="succeeded",chargeCaptured:charge.captured===true,chargePaid:charge.paid===true&&charge.status==="succeeded",currency:charge.currency,amount:charge.amount,refunded,pending,disputes:disputes.data.map((d:any)=>d.status)});
}
export function verifyRiskCases(){
 const base={sessionPaid:true,intentSucceeded:true,chargeCaptured:true,chargePaid:true,currency:"gbp",amount:999,refunded:0,pending:0,disputes:[]};
 const cases=[[{},"active"],[{refunded:199},"partial_refund_active"],[{refunded:999},"refunded"],[{pending:999},"refund_pending"],[{refunded:199,pending:800},"refund_pending"],[{disputes:["needs_response"]},"dispute_review"],[{disputes:["under_review"]},"dispute_review"],[{disputes:["lost"]},"dispute_lost"],[{disputes:["won"]},"active"],[{disputes:["won","lost"]},"dispute_lost"],[{refunded:999,disputes:["won"]},"refunded"],[{sessionPaid:false},"not_paid"],[{intentSucceeded:false},"not_paid"],[{chargeCaptured:false},"not_paid"],[{currency:"usd"},"not_paid"],[{amount:100},"not_paid"],[{refunded:-1},"review"],[{disputes:["unknown"]},"dispute_review"]];
 for(const [patch,result] of cases){if(classifySpecialistPayment({...base,...patch as object})!==result)throw Error("Risk fixture mismatch");}
 return cases.length;
}

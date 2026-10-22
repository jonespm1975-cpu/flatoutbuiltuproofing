// Minimal Stripe Checkout scaffold. Deploy behind HTTPS and add real authentication,
// rate limiting, monitoring, persistent storage and verified fulfilment before launch.
require('dotenv').config();
const express=require('express');const Stripe=require('stripe');const app=express();
const port=process.env.PORT||4242;const stripe=process.env.STRIPE_SECRET_KEY?new Stripe(process.env.STRIPE_SECRET_KEY):null;
// Stripe webhooks require the raw body and signature verification.
app.post('/webhook',express.raw({type:'application/json'}),(req,res)=>{
 if(!stripe||!process.env.STRIPE_WEBHOOK_SECRET)return res.status(503).send('Payment provider not configured');
 let event;try{event=stripe.webhooks.constructEvent(req.body,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET)}catch(err){return res.status(400).send(`Webhook signature error: ${err.message}`)}
 // TODO: Persist event.id idempotently to a database. Fulfil access only after verified
 // checkout.session.completed and any required payment status checks. Never trust browser redirects.
 if(event.type==='checkout.session.completed'){console.log('Verified checkout completed:',event.data.object.id)}
 res.json({received:true});
});
app.use(express.json());
app.get('/health',(req,res)=>res.json({ok:true,app:'Flat Out Built-Up Roofing',paymentsConfigured:!!stripe}));
app.post('/create-checkout-session',async(req,res)=>{
 if(!stripe)return res.status(503).json({error:'Checkout is not configured yet.'});
 try{const session=await stripe.checkout.sessions.create({mode:'payment',line_items:[{price_data:{currency:'gbp',product_data:{name:'Three-Layer Torch-On Roofing: Foundations'},unit_amount:1999},quantity:1}],success_url:`${process.env.PUBLIC_BASE_URL}/?payment=return`,cancel_url:`${process.env.PUBLIC_BASE_URL}/?payment=cancel`,billing_address_collection:'auto'});res.json({url:session.url})}catch(e){console.error(e);res.status(500).json({error:'Unable to create checkout session.'})}
});
// Do not expose admin or transaction endpoints until authenticated, authorised and backed by a DB.
app.listen(port,()=>console.log(`Starter server listening on ${port}`));
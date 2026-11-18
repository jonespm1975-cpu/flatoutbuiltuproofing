import {supabase} from './auth.js';
const key='fobur_visitor_session';let visitor=sessionStorage.getItem(key);if(!visitor){visitor=crypto.randomUUID();sessionStorage.setItem(key,visitor)}
const ua=navigator.userAgent;const device=/iPad|Tablet/i.test(ua)?'Tablet':/Mobi|iPhone|Android/i.test(ua)?'Mobile':'Desktop';
const page=location.pathname.replace(/\/+/g,'/')||'/';
fetch('https://fhyhshakmvqwzdyannec.supabase.co/functions/v1/site-analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor,page,device}),keepalive:true}).catch(()=>{});

begin isolation level repeatable read;
do $test$
declare sid text:='cs_live_fobur_rollback_check_' || gen_random_uuid(); owner_id uuid; token uuid; recipient text; msg text:=gen_random_uuid()::text;
begin
if exists(select 1 from internal.future_contract_confirmation_jobs) then raise exception 'Queue is not isolated'; end if;
select id into strict owner_id from auth.users where lower(email) in ('flatoutbuiltuproofing@gmail.com','jonespm1975@gmail.com') order by case lower(email) when 'flatoutbuiltuproofing@gmail.com' then 0 else 1 end limit 1;
insert into public.purchase_confirmations(stripe_checkout_session_id,user_id,course_id,paid_amount_pence,currency,consent_recorded_at,terms_version) values(sid,owner_id,'beginner-training-course',999,'gbp',now(),'2026-11-21-course-v1');
select claim_token,recipient_email into strict token,recipient from public.claim_future_contract_confirmations(1) where session_id=sid;
if exists(select 1 from public.claim_future_contract_confirmations(1)) then raise exception 'duplicate claim'; end if;
if not public.finish_future_contract_confirmation(sid,token,'accepted',msg,null) then raise exception 'finish failed'; end if;
if public.finish_future_contract_confirmation(sid,token,'accepted',msg,null) then raise exception 'duplicate finish'; end if;
if not public.record_future_contract_delivery(msg,recipient,'delivered',now()) or not public.record_future_contract_delivery(msg,recipient,'delivered',now()) then raise exception 'delivery replay failed'; end if;
if not public.record_future_contract_delivery(msg,recipient,'bounced',now()) or not public.record_future_contract_delivery(msg,recipient,'delivered',now()) then raise exception 'bounce failed'; end if;
if not exists(select 1 from internal.future_contract_confirmation_jobs where stripe_checkout_session_id=sid and status='bounced' and attempts=1) then raise exception 'bounce ordering failed'; end if;
if exists(select 1 from public.claim_future_contract_confirmations(1)) then raise exception 'unexpected second send'; end if;
end $test$;
select 'passed enqueue, claim, duplicate claim, acceptance, duplicate finish, delivery replay, terminal bounce' as test;
rollback;
begin;
do $test$
declare sid text:='cs_test_fobur_rollback_'||gen_random_uuid(); owner_id uuid;
begin
select id into strict owner_id from auth.users where lower(email) in ('flatoutbuiltuproofing@gmail.com','jonespm1975@gmail.com') order by case lower(email) when 'flatoutbuiltuproofing@gmail.com' then 0 else 1 end limit 1;
for i in 1..2 loop
insert into public.purchase_confirmations(stripe_checkout_session_id,user_id,course_id,paid_amount_pence,currency,consent_recorded_at,terms_version) values(sid,owner_id,'beginner-training-course',999,'gbp',now(),'sandbox-test') on conflict (stripe_checkout_session_id) do nothing;
insert into public.sandbox_email_retry_queue(stripe_checkout_session_id) values(sid) on conflict(stripe_checkout_session_id) do nothing;
end loop;
if (select count(*) from public.sandbox_email_retry_queue where stripe_checkout_session_id=sid and attempts=0)<>1 then raise exception 'Sandbox receipt queue replay failed';end if;
if exists(select from internal.future_contract_confirmation_jobs where stripe_checkout_session_id=sid) or exists(select from internal.live_purchase_email_outbox where stripe_checkout_session_id=sid) then raise exception 'Sandbox queue isolation failed';end if;
end $test$;
select 'sandbox duplicate receipt queued once; both live queues empty for fixture' as result;rollback;
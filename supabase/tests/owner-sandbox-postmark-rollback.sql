begin;
do $test$
declare sid text:='cs_test_fobur_'||gen_random_uuid(); uid uuid; secret text; mid uuid:=gen_random_uuid(); rid bigint;
begin
 if exists(select from internal.owner_sandbox_receipt_test) then raise exception 'Owner run already exists'; end if;
 select id into strict uid from auth.users where lower(email)='jonespm1975@gmail.com' and email_confirmed_at is not null;
 insert into public.course_checkout_reservations(user_id,course_id,environment,status,stripe_session_id)
 values(uid,'beginner-training-course','test','session_created',sid);
 insert into internal.owner_sandbox_receipt_test(session_id,owner_id) values(sid,uid);
 insert into public.purchase_confirmations(stripe_checkout_session_id,user_id,course_id,paid_amount_pence,currency,consent_recorded_at,confirmed_at,terms_version)
 values(sid,uid,'beginner-training-course',999,'gbp',clock_timestamp(),clock_timestamp(),'sandbox-test');
 select request_id into strict rid from internal.owner_sandbox_receipt_test where session_id=sid;
 if rid is null then raise exception 'dispatch missing'; end if;
 select headers->>'x-owner-check' into strict secret from net.http_request_queue where id=rid;
 if public.claim_owner_sandbox_receipt(repeat('0',64)) is not null then raise exception 'invalid claim';end if;
 if public.claim_owner_sandbox_receipt(secret) is distinct from sid then raise exception 'valid claim failed';end if;
 if public.claim_owner_sandbox_receipt(secret) is not null then raise exception 'duplicate claim';end if;
 if not public.finish_owner_sandbox_receipt(secret,mid) or public.finish_owner_sandbox_receipt(secret,mid) then raise exception 'acceptance replay';end if;
 if not public.record_owner_sandbox_receipt_event(mid,'Delivery',now()) or not public.record_owner_sandbox_receipt_event(mid,'Bounce',now()) or public.record_owner_sandbox_receipt_event(gen_random_uuid(),'Delivery',now()) then raise exception 'callback matching';end if;
end $test$;
select 'passed; test transaction is rolled back before pg_net transmits' as result;
rollback;
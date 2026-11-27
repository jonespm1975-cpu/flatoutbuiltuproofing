DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM internal.specialist_course_checkout_reservations) OR EXISTS(SELECT 1 FROM public.purchase_confirmations WHERE course_id ~ '^(bu|ts|ms|la)-0[1-6]$') OR EXISTS(SELECT 1 FROM public.course_access WHERE course_id ~ '^(bu|ts|ms|la)-0[1-6]$') THEN RAISE EXCEPTION 'Existing specialist records require a multi-version migration'; END IF; END $guard$;
CREATE OR REPLACE FUNCTION public.apply_specialist_course_payment(p_user uuid, p_course text, p_key uuid, p_session text, p_consent timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r internal.specialist_course_checkout_reservations%rowtype;
begin
 if p_session is null or left(p_session,8)<>'cs_live_' or p_consent is null then return false; end if;
 select * into r from internal.specialist_course_checkout_reservations where user_id=p_user and course_id=p_course and reservation_key=p_key for update;
 if not found or r.stripe_session_id is distinct from p_session or r.created_at is distinct from p_consent then return false; end if;
 insert into public.purchase_confirmations(stripe_checkout_session_id,user_id,course_id,paid_amount_pence,currency,consent_recorded_at,terms_version) values(p_session,p_user,p_course,999,'gbp',p_consent,'specialist-2026-11-27-v2') on conflict(stripe_checkout_session_id) do nothing;
 if not exists(select 1 from public.purchase_confirmations where stripe_checkout_session_id=p_session and user_id=p_user and course_id=p_course and paid_amount_pence=999 and currency='gbp' and terms_version='specialist-2026-11-27-v2') then raise exception 'Specialist receipt conflict'; end if;
 insert into public.course_access(user_id,course_id,stripe_checkout_session_id) values(p_user,p_course,p_session) on conflict(user_id,course_id) do nothing;
 if not exists(select 1 from public.course_access where user_id=p_user and course_id=p_course and stripe_checkout_session_id=p_session) then raise exception 'Specialist entitlement conflict'; end if;
 return true;
end $function$;

CREATE OR REPLACE FUNCTION internal.is_specialist_confirmation_course(p_course text, p_version text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select coalesce(p_version='specialist-2026-11-27-v2' and p_course in ('bu-01','bu-02','bu-03','bu-04','bu-05','bu-06','ts-01','ts-02','ts-03','ts-04','ts-05','ts-06','ms-01','ms-02','ms-03','ms-04','ms-05','ms-06','la-01','la-02','la-03','la-04','la-05','la-06'),false) $function$;

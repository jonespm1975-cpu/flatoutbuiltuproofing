create table internal.specialist_course_checkout_reservations (
 user_id uuid not null references auth.users(id),
 course_id text not null check(course_id ~ '^(bu|ts|ms|la)-0[1-6]$'),
 reservation_key uuid not null default gen_random_uuid() unique,
 created_at timestamptz not null default now(),
 stripe_session_id text unique check(stripe_session_id is null or left(stripe_session_id,8)='cs_live_'),
 primary key(user_id,course_id)
);
alter table internal.specialist_course_checkout_reservations enable row level security;
revoke all on internal.specialist_course_checkout_reservations from public, anon, authenticated;
grant select,insert,update on internal.specialist_course_checkout_reservations to service_role;
create function public.reserve_specialist_course_checkout(p_user uuid,p_course text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r internal.specialist_course_checkout_reservations%rowtype;
begin
 if p_user is null or p_course is null or p_course !~ '^(bu|ts|ms|la)-0[1-6]$' then return jsonb_build_object('result','invalid'); end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text||':'||p_course||':specialist-live',0));
 if exists(select 1 from public.course_access where user_id=p_user and course_id=p_course and left(stripe_checkout_session_id,8)='cs_live_') or exists(select 1 from public.purchase_confirmations where user_id=p_user and course_id=p_course and left(stripe_checkout_session_id,8)='cs_live_') then return jsonb_build_object('result','owned_or_paid'); end if;
 insert into internal.specialist_course_checkout_reservations(user_id,course_id) values(p_user,p_course) on conflict(user_id,course_id) do nothing;
 select * into r from internal.specialist_course_checkout_reservations where user_id=p_user and course_id=p_course;
 if r.created_at < pg_catalog.clock_timestamp()-interval '23 hours' and r.stripe_session_id is null then return jsonb_build_object('result','review_required'); end if;
 return jsonb_build_object('result','reserved','reservation_key',r.reservation_key,'created_at',r.created_at,'stripe_session_id',r.stripe_session_id);
end $$;
revoke all on function public.reserve_specialist_course_checkout(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_specialist_course_checkout(uuid,text) to service_role;
create function public.attach_specialist_course_checkout(p_user uuid,p_course text,p_key uuid,p_session text) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 if p_session is null or left(p_session,8)<>'cs_live_' then return false; end if;
 update internal.specialist_course_checkout_reservations set stripe_session_id=p_session where user_id=p_user and course_id=p_course and reservation_key=p_key and (stripe_session_id is null or stripe_session_id=p_session);
 return found;
end $$;
revoke all on function public.attach_specialist_course_checkout(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.attach_specialist_course_checkout(uuid,text,uuid,text) to service_role;
create function public.apply_specialist_course_payment(p_user uuid,p_course text,p_key uuid,p_session text,p_consent timestamptz) returns boolean
language plpgsql security invoker set search_path='' as $$
declare r internal.specialist_course_checkout_reservations%rowtype;
begin
 if p_session is null or left(p_session,8)<>'cs_live_' or p_consent is null then return false; end if;
 select * into r from internal.specialist_course_checkout_reservations where user_id=p_user and course_id=p_course and reservation_key=p_key for update;
 if not found or r.stripe_session_id is distinct from p_session or r.created_at is distinct from p_consent then return false; end if;
 insert into public.purchase_confirmations(stripe_checkout_session_id,user_id,course_id,paid_amount_pence,currency,consent_recorded_at,terms_version) values(p_session,p_user,p_course,999,'gbp',p_consent,'specialist-draft-v1') on conflict(stripe_checkout_session_id) do nothing;
 if not exists(select 1 from public.purchase_confirmations where stripe_checkout_session_id=p_session and user_id=p_user and course_id=p_course and paid_amount_pence=999 and currency='gbp' and terms_version='specialist-draft-v1') then raise exception 'Specialist receipt conflict'; end if;
 insert into public.course_access(user_id,course_id,stripe_checkout_session_id) values(p_user,p_course,p_session) on conflict(user_id,course_id) do nothing;
 if not exists(select 1 from public.course_access where user_id=p_user and course_id=p_course and stripe_checkout_session_id=p_session) then raise exception 'Specialist entitlement conflict'; end if;
 return true;
end $$;
revoke all on function public.apply_specialist_course_payment(uuid,text,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.apply_specialist_course_payment(uuid,text,uuid,text,timestamptz) to service_role;
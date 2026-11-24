-- REVIEW ONLY: not applied to production. Separate live reservations from test-only table.
begin;
create table public.live_course_checkout_reservations (
 user_id uuid not null references auth.users(id),
 course_id text not null check (course_id='beginner-training-course'),
 reservation_key uuid not null default gen_random_uuid() unique,
 stripe_session_id text unique check (stripe_session_id is null or stripe_session_id like 'cs_live_%'),
 created_at timestamptz not null default now(),
 primary key(user_id,course_id)
);
alter table public.live_course_checkout_reservations enable row level security;
revoke all on public.live_course_checkout_reservations from public,anon,authenticated;
grant select,insert,update on public.live_course_checkout_reservations to service_role;

create function public.reserve_live_course_checkout(p_user_id uuid,p_course_id text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.live_course_checkout_reservations%rowtype;
begin
 if p_user_id is null or p_course_id is distinct from 'beginner-training-course' then
   return jsonb_build_object('result','invalid');
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||p_course_id||':live',0));
 if exists(select 1 from public.course_access where user_id=p_user_id and course_id=p_course_id and left(stripe_checkout_session_id,8)='cs_live_')
 or exists(select 1 from public.purchase_confirmations where user_id=p_user_id and course_id=p_course_id and left(stripe_checkout_session_id,8)='cs_live_') then
   return jsonb_build_object('result','owned_or_paid');
 end if;
 select * into r from public.live_course_checkout_reservations where user_id=p_user_id and course_id=p_course_id;
 if found then return jsonb_build_object('result','existing','reservation_key',r.reservation_key,'stripe_session_id',r.stripe_session_id); end if;
 insert into public.live_course_checkout_reservations(user_id,course_id) values(p_user_id,p_course_id) returning * into r;
 return jsonb_build_object('result','create_once','reservation_key',r.reservation_key);
end $$;
revoke all on function public.reserve_live_course_checkout(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_live_course_checkout(uuid,text) to service_role;

create function public.attach_live_course_checkout(p_user_id uuid,p_course_id text,p_key uuid,p_session text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_session is null or left(p_session,8)<>'cs_live_' then return false; end if;
 update public.live_course_checkout_reservations set stripe_session_id=p_session
 where user_id=p_user_id and course_id=p_course_id and reservation_key=p_key
 and (stripe_session_id is null or stripe_session_id=p_session);
 return found;
end $$;
revoke all on function public.attach_live_course_checkout(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.attach_live_course_checkout(uuid,text,uuid,text) to service_role;
commit;

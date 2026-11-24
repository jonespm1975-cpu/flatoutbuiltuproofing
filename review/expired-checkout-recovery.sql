-- REVIEW ONLY. Apply after live-checkout-reservation.sql in isolated test DB.
-- Rotate only an exact, previously attached reservation after server-side Stripe verification.
begin;
create function public.rotate_expired_live_course_checkout(p_user_id uuid,p_course_id text,p_key uuid,p_session text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.live_course_checkout_reservations%rowtype;
begin
 if p_user_id is null or p_course_id is distinct from 'beginner-training-course' or p_key is null or p_session is null or left(p_session,8)<>'cs_live_' then
 return jsonb_build_object('result','invalid'); end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||p_course_id||':live',0));
 if exists(select 1 from public.course_access where user_id=p_user_id and course_id=p_course_id and left(stripe_checkout_session_id,8)='cs_live_')
 or exists(select 1 from public.purchase_confirmations where user_id=p_user_id and course_id=p_course_id and left(stripe_checkout_session_id,8)='cs_live_') then
 return jsonb_build_object('result','owned_or_paid'); end if;
 update public.live_course_checkout_reservations set reservation_key=gen_random_uuid(),stripe_session_id=null,created_at=now()
 where user_id=p_user_id and course_id=p_course_id and reservation_key=p_key and stripe_session_id=p_session
 returning * into r;
 if not found then return jsonb_build_object('result','conflict'); end if;
 return jsonb_build_object('result','create_once','reservation_key',r.reservation_key);
end $$;
revoke all on function public.rotate_expired_live_course_checkout(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.rotate_expired_live_course_checkout(uuid,text,uuid,text) to service_role;
commit;

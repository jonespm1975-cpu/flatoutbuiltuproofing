-- Separate evidence for authenticated V2 sandbox checkout. Never grants production entitlement.
create table internal.specialist_v2_authenticated_sandbox_evidence (
 session_id text primary key check(left(session_id,8)='cs_test_'),
 event_id text not null check(left(event_id,4)='evt_'),
 qa_user_id uuid not null,
 course_id text not null check(course_id='bu-03'),
 price_id text not null check(price_id='price_1UgUjS3eiZFnd5l0Mdw7nh1m'),
 terms_version text not null check(terms_version='specialist-2026-11-27-v2'),
 consent_at timestamptz not null,
 verified_at timestamptz not null default clock_timestamp()
);
alter table internal.specialist_v2_authenticated_sandbox_evidence enable row level security;
revoke all on internal.specialist_v2_authenticated_sandbox_evidence from public, anon, authenticated, service_role;
create function public.record_specialist_v2_authenticated_sandbox_payment(p_session text,p_event text,p_user uuid,p_course text,p_price text,p_version text,p_consent timestamptz)
returns boolean language plpgsql security definer set search_path to '' as $function$
begin
 if p_session is null or left(p_session,8)<>'cs_test_' or p_event is null or left(p_event,4)<>'evt_' or p_course is distinct from 'bu-03' or p_price is distinct from 'price_1UgUjS3eiZFnd5l0Mdw7nh1m' or p_version is distinct from 'specialist-2026-11-27-v2' or p_consent is null or p_consent>clock_timestamp() then return false; end if;
 if exists(select 1 from internal.specialist_v2_authenticated_sandbox_evidence e where e.session_id=p_session and e.qa_user_id=p_user and e.course_id=p_course and e.price_id=p_price and e.terms_version=p_version and e.consent_at=p_consent) then return true; end if;
 if not exists(select 1 from auth.users u where u.id=p_user and not u.is_anonymous and u.raw_app_meta_data->>'fobur_specialist_v2_qa'='qa-v2-auth-20261127' and u.raw_app_meta_data->>'fobur_qa_session_id'=p_session and u.raw_app_meta_data->>'fobur_qa_consent_at' is not null and (u.raw_app_meta_data->>'fobur_qa_consent_at')::timestamptz=p_consent) then return false; end if;
 insert into internal.specialist_v2_authenticated_sandbox_evidence(session_id,event_id,qa_user_id,course_id,price_id,terms_version,consent_at) values(p_session,p_event,p_user,p_course,p_price,p_version,p_consent) on conflict(session_id) do nothing;
 return exists(select 1 from internal.specialist_v2_authenticated_sandbox_evidence e where e.session_id=p_session and e.qa_user_id=p_user and e.course_id=p_course and e.price_id=p_price and e.terms_version=p_version and e.consent_at=p_consent);
end
$function$;
revoke all on function public.record_specialist_v2_authenticated_sandbox_payment(text,text,uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_specialist_v2_authenticated_sandbox_payment(text,text,uuid,text,text,text,timestamptz) to service_role;
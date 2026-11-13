-- Task 40 applied in Supabase on 2026-11-13
create or replace function public.claim_test_course_confirmation_email(p_session text)
returns table(claim_token uuid,attempt_number integer)
language sql security definer set search_path='' as $$
with candidate as (
 select q.stripe_checkout_session_id
 from public.sandbox_email_retry_queue q
 join public.purchase_confirmations c on c.stripe_checkout_session_id=q.stripe_checkout_session_id
 where q.stripe_checkout_session_id=p_session and p_session like 'cs_test_%'
 and c.terms_version='sandbox-test' and c.confirmation_email_status='pending'
 and q.attempts<5 and
 ((q.status='pending' and q.next_attempt_at<=now()) or (q.status='leased' and q.lease_until<=now()))
 for update of q skip locked
)
update public.sandbox_email_retry_queue q set status='leased',attempts=q.attempts+1,
lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now()
from candidate c where q.stripe_checkout_session_id=c.stripe_checkout_session_id
returning q.lease_token,q.attempts
$$;
revoke all on function public.claim_test_course_confirmation_email(text) from public,anon,authenticated;
grant execute on function public.claim_test_course_confirmation_email(text) to service_role;
create or replace function public.finish_test_course_confirmation_email(p_session text,p_token uuid,p_accepted boolean,p_provider_id text default null,p_error text default null)
returns boolean language sql security definer set search_path='' as $$
select internal.finish_sandbox_email_retry_v3(p_session,p_token,p_accepted,p_provider_id,p_error)
$$;
revoke all on function public.finish_test_course_confirmation_email(text,uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.finish_test_course_confirmation_email(text,uuid,boolean,text,text) to service_role;
\set ON_ERROR_STOP on
CREATE SCHEMA internal;
CREATE TABLE public.purchase_confirmations(stripe_checkout_session_id text PRIMARY KEY,terms_version text NOT NULL,confirmation_email_status text NOT NULL,confirmation_email_sent_at timestamptz,confirmation_email_error text);
CREATE TABLE public.sandbox_email_retry_queue(stripe_checkout_session_id text PRIMARY KEY REFERENCES public.purchase_confirmations,status text NOT NULL,attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now(),lease_token uuid,lease_until timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),provider_message_id text,last_error text);
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE OR REPLACE FUNCTION public.claim_test_course_confirmation_email(p_session text)
RETURNS TABLE(claim_token uuid,attempt_number integer) LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
with candidate as (
 select q.stripe_checkout_session_id from public.sandbox_email_retry_queue q
 join public.purchase_confirmations c on c.stripe_checkout_session_id=q.stripe_checkout_session_id
 where q.stripe_checkout_session_id=p_session and p_session like 'cs_test_%'
 and c.terms_version='sandbox-test' and c.confirmation_email_status='pending'
 and q.attempts<5 and ((q.status='pending' and q.next_attempt_at<=now()) or (q.status='leased' and q.lease_until<=now()))
 for update of q skip locked
)
update public.sandbox_email_retry_queue q set status='leased',attempts=q.attempts+1,
lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now()
from candidate c where q.stripe_checkout_session_id=c.stripe_checkout_session_id
returning q.lease_token,q.attempts
$$;
CREATE OR REPLACE FUNCTION internal.finish_sandbox_email_retry_v3(p_session text,p_token uuid,p_accepted boolean,p_provider_id text DEFAULT NULL,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SET search_path TO '' AS $$
declare changed integer;
begin
 if p_session not like 'cs_test_%' or p_token is null then return false; end if;
 if p_accepted and nullif(btrim(p_provider_id),'') is null then return false; end if;
 with eligible as (
  select q.stripe_checkout_session_id from public.sandbox_email_retry_queue q
  join public.purchase_confirmations c on c.stripe_checkout_session_id=q.stripe_checkout_session_id
  where q.stripe_checkout_session_id=p_session and q.status='leased'
    and q.lease_token=p_token and q.lease_until>now()
    and c.terms_version='sandbox-test' and c.confirmation_email_status='pending'
  for update of q,c
 ), updated_queue as (
  update public.sandbox_email_retry_queue q set
    status=case when p_accepted then 'accepted' when q.attempts>=5 then 'failed' else 'pending' end,
    provider_message_id=case when p_accepted then p_provider_id else q.provider_message_id end,
    last_error=case when p_accepted then null else left(coalesce(p_error,'Delivery failed'),500) end,
    next_attempt_at=case when p_accepted then q.next_attempt_at else now()+make_interval(secs=>least(3600,60*power(2,q.attempts-1)::integer)) end,
    lease_until=null,lease_token=null,updated_at=now()
  from eligible e where q.stripe_checkout_session_id=e.stripe_checkout_session_id
  returning q.stripe_checkout_session_id
 )
 update public.purchase_confirmations c set
  confirmation_email_status=case when p_accepted then 'sent' else 'pending' end,
  confirmation_email_sent_at=case when p_accepted then now() else c.confirmation_email_sent_at end,
  confirmation_email_error=case when p_accepted then null else left(coalesce(p_error,'Delivery failed'),500) end
 from updated_queue q where c.stripe_checkout_session_id=q.stripe_checkout_session_id;
 get diagnostics changed=row_count;
 return changed=1;
end;$$;
CREATE OR REPLACE FUNCTION public.finish_test_course_confirmation_email(p_session text,p_token uuid,p_accepted boolean,p_provider_id text DEFAULT NULL,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$select internal.finish_sandbox_email_retry_v3(p_session,p_token,p_accepted,p_provider_id,p_error)$$;
INSERT INTO public.purchase_confirmations(stripe_checkout_session_id,terms_version,confirmation_email_status) VALUES ('cs_test_atomic_fixture','sandbox-test','pending');
INSERT INTO public.sandbox_email_retry_queue(stripe_checkout_session_id,status) VALUES ('cs_test_atomic_fixture','pending');

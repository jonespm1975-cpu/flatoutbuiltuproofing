-- Snapshot of deployed sandbox retry completion function (12 Nov 2026).
-- Source of truth: Supabase internal.finish_sandbox_email_retry_v3.
-- Sandbox only; does not activate emails or live checkout.

CREATE OR REPLACE FUNCTION internal.finish_sandbox_email_retry_v3(p_session text, p_token uuid, p_accepted boolean, p_provider_id text DEFAULT NULL::text, p_error text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end;$function$


REVOKE ALL ON FUNCTION internal.finish_sandbox_email_retry_v3(text,uuid,boolean,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION internal.finish_sandbox_email_retry_v3(text,uuid,boolean,text,text) TO service_role;

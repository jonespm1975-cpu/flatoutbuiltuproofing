CREATE OR REPLACE FUNCTION public.finish_live_purchase_email_retry(p_session text, p_token uuid, p_accepted boolean, p_provider_id text DEFAULT NULL::text, p_error text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  buyer_id uuid;
  purchase_course text;
  purchase_terms text;
begin
 if p_session is null or left(p_session, 8) <> 'cs_live_' or p_token is null or p_accepted is null then return false; end if;
 if p_accepted and nullif(btrim(p_provider_id),'') is null then return false; end if;
 with eligible as (
  select q.stripe_checkout_session_id
  from internal.live_purchase_email_outbox q
  join public.purchase_confirmations c on c.stripe_checkout_session_id=q.stripe_checkout_session_id
  where q.stripe_checkout_session_id=p_session
    and q.status='leased' and q.lease_token=p_token and q.lease_until>now()
    and c.confirmation_email_status='pending' and c.terms_version<>'sandbox-test'
    and c.currency='gbp' and c.paid_amount_pence=999
  for update of q,c
 ), updated_queue as (
  update internal.live_purchase_email_outbox q set
   status=case when p_accepted then 'accepted' when q.attempts>=5 then 'failed' else 'pending' end,
   provider_message_id=case when p_accepted then p_provider_id else q.provider_message_id end,
   last_error=case when p_accepted then null else left(coalesce(p_error,'Delivery failed'),500) end,
   next_attempt_at=case when p_accepted then q.next_attempt_at else now()+make_interval(secs=>least(3600,60*power(2,greatest(q.attempts-1,0))::integer)) end,
   lease_until=null,lease_token=null,updated_at=now()
  from eligible e where q.stripe_checkout_session_id=e.stripe_checkout_session_id
  returning q.stripe_checkout_session_id
 )
 update public.purchase_confirmations c set
  confirmation_email_status=case when p_accepted then 'sent' else 'pending' end,
  confirmation_email_sent_at=case when p_accepted then now() else c.confirmation_email_sent_at end,
  confirmation_email_error=case when p_accepted then null else left(coalesce(p_error,'Delivery failed'),500) end
 from updated_queue q where c.stripe_checkout_session_id=q.stripe_checkout_session_id
 returning c.user_id, c.course_id, c.terms_version
 into buyer_id, purchase_course, purchase_terms;

 if not found then return false; end if;

 -- New orders unlock in the same transaction that records provider acceptance.
 if p_accepted and purchase_terms = '2026-11-21-course-v1'
    and purchase_course = 'beginner-training-course' then
   insert into public.course_access as existing (user_id, course_id, stripe_checkout_session_id)
   values (buyer_id, purchase_course, p_session)
   on conflict (user_id, course_id) do update
     set stripe_checkout_session_id = excluded.stripe_checkout_session_id
     where left(existing.stripe_checkout_session_id, 8) = 'cs_test_';
 end if;

 return true;
end;
$function$;

revoke execute on function public.finish_live_purchase_email_retry(text, uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.finish_live_purchase_email_retry(text, uuid, boolean, text, text) to service_role;

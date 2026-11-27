-- Keep the original beginner-course claim RPC unchanged. Specialist jobs are isolated until the Postmark worker is deployed.
create or replace function internal.is_specialist_confirmation_course(p_course text,p_version text) returns boolean language sql immutable security invoker set search_path to '' as $$ select coalesce(p_version='specialist-2026-11-27-v1' and p_course in ('bu-01','bu-02','bu-03','bu-04','bu-05','bu-06','ts-01','ts-02','ts-03','ts-04','ts-05','ts-06','ms-01','ms-02','ms-03','ms-04','ms-05','ms-06','la-01','la-02','la-03','la-04','la-05','la-06'),false) $$;
revoke all on function internal.is_specialist_confirmation_course(text,text) from public,anon,authenticated;
grant execute on function internal.is_specialist_confirmation_course(text,text) to service_role;

CREATE OR REPLACE FUNCTION internal.enqueue_future_contract_confirmation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF left(NEW.stripe_checkout_session_id,8)='cs_live_'
    AND ((NEW.course_id='beginner-training-course' AND NEW.terms_version='2026-11-21-course-v1') OR internal.is_specialist_confirmation_course(NEW.course_id,NEW.terms_version))
    AND NEW.paid_amount_pence=999
    AND lower(NEW.currency)='gbp'
    AND NEW.consent_recorded_at IS NOT NULL
    AND NEW.confirmation_email_status='pending'
 THEN
   INSERT INTO internal.future_contract_confirmation_jobs(stripe_checkout_session_id)
   VALUES(NEW.stripe_checkout_session_id) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION internal.enqueue_live_purchase_confirmation_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.stripe_checkout_session_id like 'cs_live_%'
     and new.confirmation_email_status = 'pending'
     and not internal.is_specialist_confirmation_course(new.course_id,new.terms_version)
  then
    insert into internal.live_purchase_email_outbox(stripe_checkout_session_id,status,attempts,next_attempt_at)
    values(new.stripe_checkout_session_id,'pending',0,now())
    on conflict (stripe_checkout_session_id) do nothing;
  end if;
  return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.claim_specialist_contract_confirmations(p_limit integer DEFAULT 0)
 RETURNS TABLE(session_id text, claim_token uuid, recipient_email text, course_id text, paid_amount_pence integer, currency text, terms_version text, consent_recorded_at timestamp with time zone, confirmed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT q.stripe_checkout_session_id
    FROM internal.future_contract_confirmation_jobs q
    JOIN public.purchase_confirmations c
      ON c.stripe_checkout_session_id=q.stripe_checkout_session_id
    JOIN auth.users u ON u.id=c.user_id
    WHERE q.status='pending' AND q.attempts=0
      AND left(q.stripe_checkout_session_id,8)='cs_live_'
      AND c.confirmation_email_status='pending'
      AND internal.is_specialist_confirmation_course(c.course_id,c.terms_version)
      AND c.confirmed_at >= c.consent_recorded_at
      AND EXISTS (SELECT 1 FROM public.course_access ca WHERE ca.user_id=c.user_id AND ca.course_id=c.course_id AND ca.stripe_checkout_session_id=c.stripe_checkout_session_id)
      AND EXISTS (SELECT 1 FROM internal.specialist_course_checkout_reservations sr WHERE sr.user_id=c.user_id AND sr.course_id=c.course_id AND sr.stripe_session_id=c.stripe_checkout_session_id AND sr.created_at=c.consent_recorded_at)
      AND c.paid_amount_pence=999 AND lower(c.currency)='gbp'
      AND c.consent_recorded_at IS NOT NULL
      AND u.email IS NOT NULL AND length(btrim(u.email))>3
      -- A prior provider-accepted historical message is never replayed.
      AND NOT EXISTS (
        SELECT 1 FROM internal.live_purchase_email_outbox prior
        WHERE prior.stripe_checkout_session_id=q.stripe_checkout_session_id
          AND prior.status IN ('accepted','delivered')
      )
    ORDER BY q.created_at
    FOR UPDATE OF q SKIP LOCKED
    LIMIT least(greatest(coalesce(p_limit,0),0),3)
  ), claims AS (
    UPDATE internal.future_contract_confirmation_jobs q
    SET status='leased',attempts=1,lease_token=gen_random_uuid(),
        lease_until=clock_timestamp()+interval '5 minutes',
        updated_at=clock_timestamp(),recipient_email=u.email
    FROM candidates candidate
    JOIN public.purchase_confirmations c ON c.stripe_checkout_session_id=candidate.stripe_checkout_session_id
    JOIN auth.users u ON u.id=c.user_id
    WHERE q.stripe_checkout_session_id=candidate.stripe_checkout_session_id
    RETURNING q.stripe_checkout_session_id,q.lease_token
  )
  SELECT claims.stripe_checkout_session_id,claims.lease_token,
         u.email::text,c.course_id,c.paid_amount_pence,c.currency,c.terms_version,
         c.consent_recorded_at,c.confirmed_at
  FROM claims
  JOIN public.purchase_confirmations c
    ON c.stripe_checkout_session_id=claims.stripe_checkout_session_id
  JOIN auth.users u ON u.id=c.user_id;
END;
$function$;
revoke all on function public.claim_specialist_contract_confirmations(integer) from public,anon,authenticated;
grant execute on function public.claim_specialist_contract_confirmations(integer) to service_role;

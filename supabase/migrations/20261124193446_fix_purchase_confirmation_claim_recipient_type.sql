CREATE OR REPLACE FUNCTION public.claim_future_contract_confirmations(p_limit integer DEFAULT 1)
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
      AND c.terms_version='2026-11-21-course-v1'
      AND c.course_id='beginner-training-course'
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
$function$

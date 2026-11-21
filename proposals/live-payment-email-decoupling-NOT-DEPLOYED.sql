-- PROPOSAL ONLY — not deployed. Sandbox/ephemeral PostgreSQL review candidate.
-- DO NOT apply to production before a UK consumer-law review and an approved release.
-- Caller MUST be a validly signed Stripe webhook that checks paid status, live mode,
-- GBP 999, one approved one-off price, GB eligibility, buyer identity and three
-- separately recorded checkout consents.
--
-- NOTE: Recording access immediately may start digital-content supply before the
-- durable contract notice is confirmed. Confirmation obligations and cancellation
-- rights must be separately resolved before any production cutover (CCR 2013,
-- regs 16 and 37). Never mark a cancellation right forfeited based on this RPC.

CREATE OR REPLACE FUNCTION public.record_verified_live_course_purchase(
 p_session text,
 p_user_id uuid,
 p_course_id text,
 p_amount_pence integer,
 p_currency text,
 p_price_id text,
 p_country text,
 p_terms_version text,
 p_consent_recorded_at timestamptz
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
 v_row public.purchase_confirmations%ROWTYPE;
 v_inserted boolean := false;
BEGIN
 IF p_session IS NULL OR left(p_session,8) <> 'cs_live_'
   OR p_user_id IS NULL
   OR p_course_id IS DISTINCT FROM 'beginner-training-course'
   OR p_amount_pence IS DISTINCT FROM 999
   OR p_currency IS DISTINCT FROM 'gbp'
   OR p_price_id IS DISTINCT FROM 'price_1UaRJvKeIprRDTKxKDawW6ZG'
   OR p_country IS DISTINCT FROM 'GB'
   OR p_terms_version IS DISTINCT FROM '2026-11-21-course-v1'
   OR p_consent_recorded_at IS NULL
   OR p_consent_recorded_at > now() + interval '5 minutes'
 THEN RAISE EXCEPTION 'Rejected invalid live course payment evidence'; END IF;

 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user_id) THEN
   RAISE EXCEPTION 'Unknown purchasing account';
 END IF;

 INSERT INTO public.purchase_confirmations(
   stripe_checkout_session_id,user_id,course_id,paid_amount_pence,
   currency,consent_recorded_at,terms_version,confirmation_email_status
 ) VALUES (
   p_session,p_user_id,p_course_id,p_amount_pence,p_currency,
   p_consent_recorded_at,p_terms_version,'pending'
 )
 ON CONFLICT (stripe_checkout_session_id) DO NOTHING;
 GET DIAGNOSTICS v_inserted = ROW_COUNT;

 SELECT * INTO v_row FROM public.purchase_confirmations
  WHERE stripe_checkout_session_id=p_session FOR UPDATE;
 IF NOT FOUND OR v_row.user_id IS DISTINCT FROM p_user_id
   OR v_row.course_id IS DISTINCT FROM p_course_id
   OR v_row.paid_amount_pence IS DISTINCT FROM p_amount_pence
   OR v_row.currency IS DISTINCT FROM p_currency
   OR v_row.terms_version IS DISTINCT FROM p_terms_version
   OR v_row.consent_recorded_at IS DISTINCT FROM p_consent_recorded_at
 THEN RAISE EXCEPTION 'Existing payment record does not match signed event'; END IF;

 -- Entitlement is now recorded as a consequence of validated payment, not email.
 INSERT INTO public.course_access AS existing
   (user_id,course_id,stripe_checkout_session_id)
 VALUES(p_user_id,p_course_id,p_session)
 ON CONFLICT (user_id,course_id) DO UPDATE
   SET stripe_checkout_session_id=excluded.stripe_checkout_session_id
   WHERE existing.stripe_checkout_session_id IS NULL
      OR left(existing.stripe_checkout_session_id,8) = 'cs_test_';

 -- Email is independently queued. Its existing trigger may already have queued it.
 INSERT INTO internal.live_purchase_email_outbox
   (stripe_checkout_session_id,status,attempts,next_attempt_at)
 VALUES (p_session,'pending',0,now())
 ON CONFLICT (stripe_checkout_session_id) DO NOTHING;

 RETURN CASE WHEN v_inserted THEN 'recorded' ELSE 'already_recorded' END;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_verified_live_course_purchase(
 text,uuid,text,integer,text,text,text,text,timestamptz
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_live_course_purchase(
 text,uuid,text,integer,text,text,text,text,timestamptz
) TO service_role;

-- Proposed decoupled email finalizer. Retains the present claim/lease and
-- Resend acceptance/retry accounting. Does not control course_access.
CREATE OR REPLACE FUNCTION public.finish_live_purchase_email_retry(
 p_session text,p_token uuid,p_accepted boolean,
 p_provider_id text DEFAULT NULL,p_error text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
 IF p_session IS NULL OR left(p_session,8) <> 'cs_live_'
    OR p_token IS NULL OR p_accepted IS NULL THEN RETURN false; END IF;
 IF p_accepted AND nullif(btrim(p_provider_id),'') IS NULL THEN RETURN false; END IF;
 WITH eligible AS (
   SELECT q.stripe_checkout_session_id
   FROM internal.live_purchase_email_outbox q
   JOIN public.purchase_confirmations c USING(stripe_checkout_session_id)
   WHERE q.stripe_checkout_session_id=p_session
     AND q.status='leased' AND q.lease_token=p_token
     AND q.lease_until>now()
     AND c.confirmation_email_status='pending'
     AND c.terms_version<>'sandbox-test'
     AND c.currency='gbp' AND c.paid_amount_pence=999
   FOR UPDATE OF q,c
 ), updated_queue AS (
   UPDATE internal.live_purchase_email_outbox q SET
     status=CASE WHEN p_accepted THEN 'accepted'
       WHEN q.attempts>=5 THEN 'failed' ELSE 'pending' END,
     provider_message_id=CASE WHEN p_accepted THEN p_provider_id
       ELSE q.provider_message_id END,
     last_error=CASE WHEN p_accepted THEN NULL
       ELSE left(coalesce(p_error,'Delivery failed'),500) END,
     next_attempt_at=CASE WHEN p_accepted THEN q.next_attempt_at
       ELSE now()+make_interval(secs=>least(3600,60*power(2,greatest(q.attempts-1,0))::integer)) END,
     lease_until=NULL,lease_token=NULL,updated_at=now()
   FROM eligible e
   WHERE q.stripe_checkout_session_id=e.stripe_checkout_session_id
   RETURNING q.stripe_checkout_session_id
 )
 UPDATE public.purchase_confirmations c SET
   confirmation_email_status=CASE WHEN p_accepted THEN 'sent' ELSE 'pending' END,
   confirmation_email_sent_at=CASE WHEN p_accepted THEN now()
     ELSE c.confirmation_email_sent_at END,
   confirmation_email_error=CASE WHEN p_accepted THEN NULL
     ELSE left(coalesce(p_error,'Delivery failed'),500) END
 FROM updated_queue q
 WHERE c.stripe_checkout_session_id=q.stripe_checkout_session_id;
 RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.finish_live_purchase_email_retry(
 text,uuid,boolean,text,text
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_live_purchase_email_retry(
 text,uuid,boolean,text,text
) TO service_role;

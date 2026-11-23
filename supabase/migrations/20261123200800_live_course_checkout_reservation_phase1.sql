-- STAGED ONLY: not applied to production. Requires review, isolated tests, and an approved cutover.
-- Prevents concurrent live £9.99 Checkout Session creation for a single buyer/course.
-- The trusted service-role checkout handler is the sole caller; clients cannot call these RPCs.
CREATE TABLE IF NOT EXISTS internal.live_course_checkout_reservations (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text NOT NULL CHECK (course_id = 'beginner-training-course'),
  reservation_key uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'creating' CHECK (status IN ('creating','open')),
  attempt_created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  leased_until timestamptz NOT NULL DEFAULT (clock_timestamp() + interval '2 minutes'),
  stripe_session_id text UNIQUE,
  stripe_url text,
  stripe_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id,course_id),
  CHECK ((status='open' AND stripe_session_id IS NOT NULL AND stripe_url IS NOT NULL AND stripe_expires_at IS NOT NULL)
      OR (status='creating' AND stripe_session_id IS NULL AND stripe_url IS NULL AND stripe_expires_at IS NULL))
);
ALTER TABLE internal.live_course_checkout_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON internal.live_course_checkout_reservations FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_live_course_checkout(
  p_user_id uuid, p_course_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE r internal.live_course_checkout_reservations%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_course_id <> 'beginner-training-course' THEN
    RETURN jsonb_build_object('result','invalid');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('live-course:'||p_user_id::text||':'||p_course_id,0));
  -- An already recorded payment or entitlement always wins over an abandoned session.
  IF EXISTS(SELECT 1 FROM public.course_access
            WHERE user_id=p_user_id AND course_id=p_course_id AND stripe_checkout_session_id LIKE 'cs_live_%')
     OR EXISTS(SELECT 1 FROM public.purchase_confirmations
               WHERE user_id=p_user_id AND course_id=p_course_id
                 AND stripe_checkout_session_id LIKE 'cs_live_%') THEN
    RETURN jsonb_build_object('result','owned');
  END IF;
  SELECT * INTO r FROM internal.live_course_checkout_reservations
    WHERE user_id=p_user_id AND course_id=p_course_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO internal.live_course_checkout_reservations(user_id,course_id)
      VALUES(p_user_id,p_course_id) RETURNING * INTO r;
    RETURN jsonb_build_object('result','create_once','reservation_key',r.reservation_key,
      'consent_recorded_at',r.attempt_created_at);
  END IF;
  IF r.status='open' THEN
    IF r.stripe_expires_at > clock_timestamp() + interval '30 seconds' THEN
      RETURN jsonb_build_object('result','open','url',r.stripe_url,
        'stripe_session_id',r.stripe_session_id);
    END IF;
    RETURN jsonb_build_object('result','reconcile','stripe_session_id',r.stripe_session_id,
      'reservation_key',r.reservation_key);
  END IF;
  IF r.leased_until > clock_timestamp() THEN
    RETURN jsonb_build_object('result','pending');
  END IF;
  -- Retry with the SAME Stripe idempotency key and exact same request body.
  -- After 20 minutes we fail closed; the key could have expired or its session
  -- could have succeeded without an acknowledged response.
  IF r.attempt_created_at < clock_timestamp() - interval '20 minutes' THEN
    RETURN jsonb_build_object('result','reconcile');
  END IF;
  UPDATE internal.live_course_checkout_reservations
    SET leased_until=clock_timestamp()+interval '2 minutes',updated_at=clock_timestamp()
    WHERE user_id=p_user_id AND course_id=p_course_id;
  RETURN jsonb_build_object('result','create_once','reservation_key',r.reservation_key,
      'consent_recorded_at',r.attempt_created_at);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.finalize_live_course_checkout(
  p_user_id uuid, p_course_id text, p_reservation_key uuid,
  p_stripe_session_id text, p_stripe_url text, p_expires_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE r internal.live_course_checkout_reservations%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_course_id <> 'beginner-training-course'
    OR p_reservation_key IS NULL OR p_stripe_session_id NOT LIKE 'cs_live_%'
    OR p_stripe_url NOT LIKE 'https://checkout.stripe.com/%'
    OR p_expires_at <= clock_timestamp() OR p_expires_at > clock_timestamp()+interval '25 hours' THEN
    RETURN jsonb_build_object('result','invalid');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('live-course:'||p_user_id::text||':'||p_course_id,0));
  IF EXISTS(SELECT 1 FROM public.purchase_confirmations
            WHERE user_id=p_user_id AND course_id=p_course_id
              AND stripe_checkout_session_id LIKE 'cs_live_%')
     OR EXISTS(SELECT 1 FROM public.course_access
               WHERE user_id=p_user_id AND course_id=p_course_id
                 AND stripe_checkout_session_id LIKE 'cs_live_%') THEN
    RETURN jsonb_build_object('result','owned');
  END IF;
  SELECT * INTO r FROM internal.live_course_checkout_reservations
    WHERE user_id=p_user_id AND course_id=p_course_id FOR UPDATE;
  IF NOT FOUND OR r.reservation_key <> p_reservation_key THEN
    RETURN jsonb_build_object('result','conflict');
  END IF;
  IF r.status='open' THEN
    RETURN jsonb_build_object('result',CASE WHEN r.stripe_session_id=p_stripe_session_id THEN 'open' ELSE 'conflict' END);
  END IF;
  UPDATE internal.live_course_checkout_reservations
     SET status='open',stripe_session_id=p_stripe_session_id,
         stripe_url=p_stripe_url,stripe_expires_at=p_expires_at,
         updated_at=clock_timestamp()
   WHERE user_id=p_user_id AND course_id=p_course_id;
  RETURN jsonb_build_object('result','open');
END;
$fn$;

-- Only after Stripe's API confirms the prior session is EXPIRED and UNPAID.
-- This RPC must not be called directly by a browser or authenticated customer.
CREATE OR REPLACE FUNCTION public.recycle_expired_live_course_checkout(
  p_user_id uuid, p_course_id text, p_reservation_key uuid, p_stripe_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE r internal.live_course_checkout_reservations%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_course_id <> 'beginner-training-course' OR p_reservation_key IS NULL THEN
    RETURN jsonb_build_object('result','invalid');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('live-course:'||p_user_id::text||':'||p_course_id,0));
  IF EXISTS(SELECT 1 FROM public.purchase_confirmations WHERE user_id=p_user_id AND course_id=p_course_id
    AND stripe_checkout_session_id LIKE 'cs_live_%')
   OR EXISTS(SELECT 1 FROM public.course_access WHERE user_id=p_user_id AND course_id=p_course_id
    AND stripe_checkout_session_id LIKE 'cs_live_%') THEN
    RETURN jsonb_build_object('result','owned');
  END IF;
  SELECT * INTO r FROM internal.live_course_checkout_reservations
   WHERE user_id=p_user_id AND course_id=p_course_id FOR UPDATE;
  IF NOT FOUND OR r.status <> 'open' OR r.reservation_key <> p_reservation_key
      OR r.stripe_session_id IS DISTINCT FROM p_stripe_session_id
      OR r.stripe_expires_at > clock_timestamp() THEN
    RETURN jsonb_build_object('result','conflict');
  END IF;
  UPDATE internal.live_course_checkout_reservations
    SET reservation_key=gen_random_uuid(),status='creating',
        attempt_created_at=clock_timestamp(),
        leased_until=clock_timestamp()+interval '2 minutes',
        stripe_session_id=NULL,stripe_url=NULL,stripe_expires_at=NULL,
        updated_at=clock_timestamp()
    WHERE user_id=p_user_id AND course_id=p_course_id RETURNING * INTO r;
  RETURN jsonb_build_object('result','create_once','reservation_key',r.reservation_key,
    'consent_recorded_at',r.attempt_created_at);
END;
$fn$;

REVOKE ALL ON FUNCTION public.reserve_live_course_checkout(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_live_course_checkout(uuid,text,uuid,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recycle_expired_live_course_checkout(uuid,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_live_course_checkout(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_live_course_checkout(uuid,text,uuid,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.recycle_expired_live_course_checkout(uuid,text,uuid,text) TO service_role;

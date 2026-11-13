-- Task 187: reviewed v4 atomic fulfilment design; DO NOT RUN IN PRODUCTION.
-- Requires isolated DB tests and a coordinated webhook release.
-- Webhook MUST verify Stripe signature, livemode, paid state, exact price,
-- line-item quantity, authenticated user, consent and terms version.
BEGIN;
CREATE OR REPLACE FUNCTION internal.fulfil_live_course_purchase_core_v4(
 p_session text,p_user uuid,p_course text,p_amount integer,
 p_currency text,p_consent_at timestamptz,p_terms text
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $core$
DECLARE v_receipt public.purchase_confirmations%ROWTYPE;
        v_grant public.course_access%ROWTYPE;
BEGIN
 IF p_session IS NULL OR p_session !~ '^cs_live_[A-Za-z0-9_]+$'
    OR p_user IS NULL OR p_course IS NULL OR btrim(p_course)=''
    OR p_amount IS DISTINCT FROM 999 OR p_currency IS DISTINCT FROM 'gbp'
    OR p_consent_at IS NULL OR p_consent_at > pg_catalog.now()
    OR p_terms IS NULL OR btrim(p_terms)='' OR p_terms='sandbox-test'
 THEN RAISE EXCEPTION 'Invalid purchase parameters'; END IF;

 -- Lock per Stripe session; unique constraints handle cross-session conflicts.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_session,187));

 SELECT * INTO v_receipt FROM public.purchase_confirmations
 WHERE stripe_checkout_session_id=p_session FOR UPDATE;
 IF FOUND THEN
   IF v_receipt.user_id IS DISTINCT FROM p_user
     OR v_receipt.course_id IS DISTINCT FROM p_course
     OR v_receipt.paid_amount_pence IS DISTINCT FROM p_amount
     OR v_receipt.currency IS DISTINCT FROM p_currency
     OR v_receipt.consent_recorded_at IS DISTINCT FROM p_consent_at
     OR v_receipt.terms_version IS DISTINCT FROM p_terms
   THEN RAISE EXCEPTION 'Immutable receipt conflict'; END IF;
 END IF;

 SELECT * INTO v_grant FROM public.course_access
 WHERE stripe_checkout_session_id=p_session FOR UPDATE;
 IF FOUND AND (v_grant.user_id IS DISTINCT FROM p_user
               OR v_grant.course_id IS DISTINCT FROM p_course)
 THEN RAISE EXCEPTION 'Entitlement session conflict'; END IF;

 -- A repeat purchase may already have an entitlement with a different session.
 -- Preserve that original grant; never reassign its session identifier.
 INSERT INTO public.course_access(user_id,course_id,stripe_checkout_session_id)
 VALUES(p_user,p_course,p_session)
 ON CONFLICT (user_id,course_id) DO NOTHING;

 INSERT INTO public.purchase_confirmations(
  stripe_checkout_session_id,user_id,course_id,paid_amount_pence,
  currency,consent_recorded_at,terms_version)
 VALUES(p_session,p_user,p_course,p_amount,p_currency,p_consent_at,p_terms)
 ON CONFLICT (stripe_checkout_session_id) DO NOTHING;
 -- Existing AFTER INSERT trigger creates exactly one outbox job per receipt.
 RETURN true;
END
$core$;
REVOKE ALL ON FUNCTION internal.fulfil_live_course_purchase_core_v4(
 text,uuid,text,integer,text,timestamptz,text)
 FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.fulfil_live_course_purchase_v4(
 p_session text,p_user uuid,p_course text,p_amount integer,
 p_currency text,p_consent_at timestamptz,p_terms text
) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $wrapper$
 SELECT internal.fulfil_live_course_purchase_core_v4(
  p_session,p_user,p_course,p_amount,p_currency,p_consent_at,p_terms);
$wrapper$;
REVOKE ALL ON FUNCTION public.fulfil_live_course_purchase_v4(
 text,uuid,text,integer,text,timestamptz,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.fulfil_live_course_purchase_v4(
 text,uuid,text,integer,text,timestamptz,text) TO service_role;
COMMIT;
-- Release gates:
-- 1. Confirm both functions owned by trusted postgres role; internal schema
--    USAGE for owner; public wrapper EXECUTE only service_role.
-- 2. Verify exact allowed course_id from STRIPE_LESSON_COURSE_ID in webhook.
-- 3. Validate receipt immutability, unique constraints, RLS, trigger,
--    two-connection concurrency, cross-session repeats and rollback.
-- 4. Update webhook to call RPC once and never send email directly.
-- 5. Worker must be sole sender, initially disabled, with safe retry behavior.
-- SECURITY: service_role credential can forge records; server-side only.

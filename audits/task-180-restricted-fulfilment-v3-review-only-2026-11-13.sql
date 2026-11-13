-- TASK 180 REVIEW ONLY — DO NOT APPLY TO PRODUCTION
-- Trusted webhook MUST verify Stripe signature, paid status, livemode,
-- allowlisted £9.99 line item, authenticated user and consent BEFORE calling.
BEGIN;
CREATE OR REPLACE FUNCTION internal.fulfil_live_course_purchase_core_v3(
 p_session text,p_user uuid,p_course text,p_amount integer,
 p_currency text,p_consent_at timestamptz,p_terms text
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $core$
DECLARE v_receipt public.purchase_confirmations%ROWTYPE;
BEGIN
 IF p_session IS NULL OR left(p_session,8)<>'cs_live_'
 OR p_user IS NULL OR p_course IS DISTINCT FROM 'beginner-training-course'
 OR p_amount IS DISTINCT FROM 999 OR p_currency IS DISTINCT FROM 'gbp'
 OR p_consent_at IS NULL OR p_terms IS NULL OR btrim(p_terms)=''
 OR p_terms='sandbox-test'
 THEN RAISE EXCEPTION 'Invalid purchase parameters'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_session,180));
 SELECT * INTO v_receipt FROM public.purchase_confirmations
 WHERE stripe_checkout_session_id=p_session FOR UPDATE;
 IF FOUND AND (v_receipt.user_id IS DISTINCT FROM p_user
 OR v_receipt.course_id IS DISTINCT FROM p_course
 OR v_receipt.paid_amount_pence IS DISTINCT FROM p_amount
 OR v_receipt.currency IS DISTINCT FROM p_currency
 OR v_receipt.consent_recorded_at IS DISTINCT FROM p_consent_at
 OR v_receipt.terms_version IS DISTINCT FROM p_terms)
 THEN RAISE EXCEPTION 'Immutable receipt conflict'; END IF;
 -- The unique user/course constraint handles concurrent different sessions.
 INSERT INTO public.course_access(user_id,course_id,stripe_checkout_session_id)
 VALUES(p_user,p_course,p_session)
 ON CONFLICT (user_id,course_id) DO NOTHING;
 -- A session reused by another user/course must fail closed.
 IF EXISTS(SELECT 1 FROM public.course_access
 WHERE stripe_checkout_session_id=p_session
 AND (user_id IS DISTINCT FROM p_user OR course_id IS DISTINCT FROM p_course))
 THEN RAISE EXCEPTION 'Entitlement session conflict'; END IF;
 INSERT INTO public.purchase_confirmations(
 stripe_checkout_session_id,user_id,course_id,paid_amount_pence,
 currency,consent_recorded_at,terms_version)
 VALUES(p_session,p_user,p_course,p_amount,p_currency,p_consent_at,p_terms)
 ON CONFLICT (stripe_checkout_session_id) DO NOTHING;
 -- Existing AFTER INSERT trigger enqueues the live email job.
 RETURN true;
END
$core$;
-- Core is callable only by its owning role, including via the wrapper below.
REVOKE ALL ON FUNCTION internal.fulfil_live_course_purchase_core_v3(
 text,uuid,text,integer,text,timestamptz,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.fulfil_live_course_purchase_v3(
 p_session text,p_user uuid,p_course text,p_amount integer,
 p_currency text,p_consent_at timestamptz,p_terms text
) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $wrapper$
 SELECT internal.fulfil_live_course_purchase_core_v3(
 p_session,p_user,p_course,p_amount,p_currency,p_consent_at,p_terms);
$wrapper$;
-- SECURITY DEFINER wrapper runs as owner, assumed postgres.
-- Confirm actual owner and internal core EXECUTE rights in disposable DB.
REVOKE ALL ON FUNCTION public.fulfil_live_course_purchase_v3(
 text,uuid,text,integer,text,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfil_live_course_purchase_v3(
 text,uuid,text,integer,text,timestamptz,text) TO service_role;
COMMIT;
-- WARNING: privileged wrapper trusts caller-supplied data, so possession of
-- service_role token enables forging grants. Keep token only server-side.
-- Deployment requires isolated permission, concurrency and trigger tests.

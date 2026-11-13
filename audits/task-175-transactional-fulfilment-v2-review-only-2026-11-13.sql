-- Task 175: REVIEW-ONLY DRAFT. NEVER RUN ON PRODUCTION WITHOUT APPROVAL.
-- SECURITY: A service_role caller must first independently verify the Stripe
-- signature, livemode, paid session, exact line-item price, user and consent.
-- RPC arguments alone cannot establish payment. This is not production-ready.
BEGIN;
CREATE OR REPLACE FUNCTION public.fulfil_live_course_purchase_v2(
 p_session text, p_user uuid, p_course text, p_amount integer,
 p_currency text, p_consent_at timestamptz, p_terms_version text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $body$
DECLARE
 v_receipt public.purchase_confirmations%ROWTYPE;
 v_grant public.course_access%ROWTYPE;
BEGIN
 IF p_session IS NULL OR left(p_session,8) <> 'cs_live_'
   OR p_user IS NULL OR p_course IS DISTINCT FROM 'beginner-training-course'
   OR p_amount IS DISTINCT FROM 999 OR p_currency IS DISTINCT FROM 'gbp'
   OR p_consent_at IS NULL OR p_terms_version IS NULL
   OR btrim(p_terms_version)='' OR p_terms_version='sandbox-test'
 THEN RAISE EXCEPTION 'Invalid verified purchase parameters'; END IF;

 -- Serialize same session. Unique indexes protect distinct sessions racing.
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(p_session, 175));

 SELECT * INTO v_receipt FROM public.purchase_confirmations
 WHERE stripe_checkout_session_id=p_session FOR UPDATE;
 IF FOUND AND (
   v_receipt.user_id IS DISTINCT FROM p_user
   OR v_receipt.course_id IS DISTINCT FROM p_course
   OR v_receipt.paid_amount_pence IS DISTINCT FROM p_amount
   OR v_receipt.currency IS DISTINCT FROM p_currency
   OR v_receipt.consent_recorded_at IS DISTINCT FROM p_consent_at
   OR v_receipt.terms_version IS DISTINCT FROM p_terms_version
 ) THEN RAISE EXCEPTION 'Immutable receipt conflict'; END IF;

 -- A second verified payment for an already-owned course preserves the grant
 -- but creates a distinct purchase receipt. Refund policy is a separate gate.
 SELECT * INTO v_grant FROM public.course_access
 WHERE user_id=p_user AND course_id=p_course FOR UPDATE;
 IF NOT FOUND THEN
   INSERT INTO public.course_access(user_id,course_id,stripe_checkout_session_id)
   VALUES(p_user,p_course,p_session)
   ON CONFLICT (user_id,course_id) DO NOTHING;
 END IF;

 -- Fail closed if this session is linked to another user's course grant.
 IF EXISTS (SELECT 1 FROM public.course_access
            WHERE stripe_checkout_session_id=p_session
              AND (user_id IS DISTINCT FROM p_user
                OR course_id IS DISTINCT FROM p_course))
 THEN RAISE EXCEPTION 'Session entitlement conflict'; END IF;

 INSERT INTO public.purchase_confirmations(
   stripe_checkout_session_id,user_id,course_id,paid_amount_pence,
   currency,consent_recorded_at,terms_version)
 VALUES(p_session,p_user,p_course,p_amount,p_currency,p_consent_at,p_terms_version)
 ON CONFLICT (stripe_checkout_session_id) DO NOTHING;
 -- Existing enabled AFTER INSERT trigger creates one outbox row.
 -- All writes and trigger effects share the same PostgreSQL transaction.
 RETURN true;
END;
$body$;

-- Restrict execution within the same DDL transaction to avoid a grant window.
REVOKE ALL ON FUNCTION public.fulfil_live_course_purchase_v2(
 text,uuid,text,integer,text,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfil_live_course_purchase_v2(
 text,uuid,text,integer,text,timestamptz,text) TO service_role;
COMMIT;

-- BEFORE RELEASE: test two independent DB sessions, trigger and RLS behavior,
-- immutable conflict and concurrent duplicate sessions, sender cutover,
-- email uncertain state and rollback. Do not call from client/browser.

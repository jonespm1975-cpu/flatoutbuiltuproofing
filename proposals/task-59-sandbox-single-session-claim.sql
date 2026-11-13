-- Task 59 — PROPOSED ONLY, NOT DEPLOYED
-- Sandbox single-session claim; intended for a separately tested webhook integration.
-- Run only after isolated concurrency tests and a deployment review.
-- Requires the existing public.sandbox_email_retry_queue and purchase_confirmations tables.
CREATE OR REPLACE FUNCTION public.claim_sandbox_confirmation_for_session(p_session text)
RETURNS TABLE(session_id text, attempt_number integer, claim_token uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $fn$
  WITH candidate AS (
    SELECT q.stripe_checkout_session_id
    FROM public.sandbox_email_retry_queue q
    JOIN public.purchase_confirmations c
      ON c.stripe_checkout_session_id = q.stripe_checkout_session_id
    WHERE q.stripe_checkout_session_id = p_session
      AND left(p_session, 8) = 'cs_test_'
      AND c.terms_version = 'sandbox-test'
      AND c.confirmation_email_status = 'pending'
      AND q.attempts < 5
      AND (
        (q.status = 'pending' AND q.next_attempt_at <= now())
        OR (q.status = 'leased' AND q.lease_until <= now())
      )
    FOR UPDATE OF q SKIP LOCKED
  )
  UPDATE public.sandbox_email_retry_queue q
  SET status = 'leased', attempts = q.attempts + 1,
      lease_token = gen_random_uuid(),
      lease_until = now() + interval '5 minutes', updated_at = now()
  FROM candidate c
  WHERE q.stripe_checkout_session_id = c.stripe_checkout_session_id
  RETURNING q.stripe_checkout_session_id, q.attempts, q.lease_token;
$fn$;
REVOKE ALL ON FUNCTION public.claim_sandbox_confirmation_for_session(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_sandbox_confirmation_for_session(text) TO service_role;
-- IMPORTANT: SECDEF owner privileges, schema exposure, and concurrent lock semantics
-- must be reviewed before deployment. Never deploy this SQL without tests.

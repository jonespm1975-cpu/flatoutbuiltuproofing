-- STAGED ONLY: Not applied to production, no scheduler or email provider activated.
-- New, independently reviewed delivery queue for FUTURE verified one-off course purchases.
-- Deliberately separate from retired internal.live_purchase_email_outbox.
-- No historical backfill; accepted old messages must never be automatically resent.

CREATE TABLE IF NOT EXISTS internal.future_contract_confirmation_jobs (
  stripe_checkout_session_id text PRIMARY KEY
    REFERENCES public.purchase_confirmations(stripe_checkout_session_id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','leased','accepted','delivered','bounced','review')),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 1),
  lease_token uuid,
  lease_until timestamptz,
  provider_message_id text,
  provider_name text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  accepted_at timestamptz,
  delivered_at timestamptz,
  CHECK (status <> 'accepted' OR provider_message_id IS NOT NULL),
  CHECK (status <> 'leased' OR (lease_token IS NOT NULL AND lease_until IS NOT NULL))
);
ALTER TABLE internal.future_contract_confirmation_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON internal.future_contract_confirmation_jobs FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS future_confirmation_pending_idx
 ON internal.future_contract_confirmation_jobs(created_at)
 WHERE status='pending' AND attempts=0;

CREATE OR REPLACE FUNCTION internal.enqueue_future_contract_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $fn$
BEGIN
 IF NEW.stripe_checkout_session_id LIKE 'cs_live_%'
    AND NEW.course_id='beginner-training-course'
    AND NEW.paid_amount_pence=999
    AND lower(NEW.currency)='gbp'
    AND NEW.terms_version='2026-11-21-course-v1'
    AND NEW.consent_recorded_at IS NOT NULL
    AND NEW.confirmation_email_status='pending'
 THEN
   INSERT INTO internal.future_contract_confirmation_jobs(stripe_checkout_session_id)
   VALUES(NEW.stripe_checkout_session_id) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_enqueue_future_contract_confirmation ON public.purchase_confirmations;
CREATE TRIGGER trg_enqueue_future_contract_confirmation
  AFTER INSERT ON public.purchase_confirmations
  FOR EACH ROW EXECUTE FUNCTION internal.enqueue_future_contract_confirmation();

CREATE OR REPLACE FUNCTION public.claim_future_contract_confirmations(p_limit integer DEFAULT 1)
RETURNS TABLE(
  session_id text,
  claim_token uuid,
  recipient_email text,
  course_id text,
  paid_amount_pence integer,
  currency text,
  terms_version text,
  consent_recorded_at timestamptz,
  confirmed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $fn$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT q.stripe_checkout_session_id
    FROM internal.future_contract_confirmation_jobs q
    JOIN public.purchase_confirmations c
      ON c.stripe_checkout_session_id=q.stripe_checkout_session_id
    JOIN auth.users u ON u.id=c.user_id
    WHERE q.status='pending' AND q.attempts=0
      AND q.stripe_checkout_session_id LIKE 'cs_live_%'
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
        updated_at=clock_timestamp()
    FROM candidates candidate
    WHERE q.stripe_checkout_session_id=candidate.stripe_checkout_session_id
    RETURNING q.stripe_checkout_session_id,q.lease_token
  )
  SELECT claims.stripe_checkout_session_id,claims.lease_token,
         u.email,c.course_id,c.paid_amount_pence,c.currency,c.terms_version,
         c.consent_recorded_at,c.confirmed_at
  FROM claims
  JOIN public.purchase_confirmations c
    ON c.stripe_checkout_session_id=claims.stripe_checkout_session_id
  JOIN auth.users u ON u.id=c.user_id;
END;
$fn$;

-- Explicit acknowledgement from a reviewed transactional provider; ambiguous
-- HTTP/network results must become 'review', not an automatic resend.
CREATE OR REPLACE FUNCTION public.finish_future_contract_confirmation(
 p_session_id text,p_claim_token uuid,p_outcome text,
 p_provider_message_id text DEFAULT NULL,p_details text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $fn$
DECLARE changed integer;
BEGIN
 IF p_session_id IS NULL OR p_claim_token IS NULL
    OR p_outcome NOT IN ('accepted','review') THEN RETURN false; END IF;
 IF p_outcome='accepted' AND nullif(btrim(p_provider_message_id),'') IS NULL THEN RETURN false; END IF;
 UPDATE internal.future_contract_confirmation_jobs q SET
   status=p_outcome,
   provider_name=CASE WHEN p_outcome='accepted' THEN 'approved-transactional-provider' ELSE q.provider_name END,
   provider_message_id=CASE WHEN p_outcome='accepted' THEN left(p_provider_message_id,255) ELSE q.provider_message_id END,
   accepted_at=CASE WHEN p_outcome='accepted' THEN clock_timestamp() ELSE q.accepted_at END,
   last_error=CASE WHEN p_outcome='review' THEN left(coalesce(p_details,'Provider outcome requires manual review'),300) ELSE NULL END,
   lease_token=NULL,lease_until=NULL,updated_at=clock_timestamp()
 WHERE q.stripe_checkout_session_id=p_session_id
   AND q.status='leased' AND q.lease_token=p_claim_token
   AND q.lease_until>clock_timestamp();
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed=1;
END;
$fn$;

-- The only caller will be the server-side, separately approved confirmation worker.
REVOKE ALL ON FUNCTION internal.enqueue_future_contract_confirmation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_future_contract_confirmations(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_future_contract_confirmation(text,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_future_contract_confirmations(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_future_contract_confirmation(text,uuid,text,text,text) TO service_role;

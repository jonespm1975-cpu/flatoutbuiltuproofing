-- CI-ONLY: disposable PostgreSQL schema, never run against production Supabase.
-- The purchase transaction independently grants entitlements before email delivery.
CREATE TABLE ci_fulfilment.email_jobs (
 session_id text PRIMARY KEY REFERENCES ci_fulfilment.outbox(session_id),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','leased','accepted','dead')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 4),
 next_attempt_at timestamptz NOT NULL DEFAULT '2026-11-01 00:00:00+00',
 lease_until timestamptz,
 lease_token uuid,
 provider_id text,
 last_error text,
 CHECK ((status='leased') = (lease_token IS NOT NULL)),
 CHECK (provider_id IS NULL OR status='accepted')
);
INSERT INTO ci_fulfilment.email_jobs(session_id)
 SELECT session_id FROM ci_fulfilment.outbox ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION ci_fulfilment.claim_email_jobs(
  p_now timestamptz, p_token uuid, p_limit integer DEFAULT 1
)
RETURNS TABLE(session_id text, claim_token uuid, attempts integer)
LANGUAGE plpgsql SET search_path=''
AS $fn$
BEGIN
 IF p_now IS NULL OR p_token IS NULL OR p_limit NOT BETWEEN 1 AND 5
 THEN RAISE EXCEPTION 'invalid claim request'; END IF;
 RETURN QUERY
 WITH picked AS (
   SELECT j.session_id FROM ci_fulfilment.email_jobs j
   WHERE j.attempts < 4 AND j.next_attempt_at <= p_now
     AND (j.status='pending' OR (j.status='leased' AND j.lease_until <= p_now))
   ORDER BY j.session_id
   FOR UPDATE SKIP LOCKED LIMIT p_limit
 ), changed AS (
   UPDATE ci_fulfilment.email_jobs j
   SET status='leased',lease_token=p_token,lease_until=p_now+interval '60 seconds',
       attempts=j.attempts+1
   FROM picked WHERE j.session_id=picked.session_id
   RETURNING j.session_id,j.lease_token,j.attempts
 ) SELECT changed.session_id,changed.lease_token,changed.attempts FROM changed;
END $fn$;

CREATE OR REPLACE FUNCTION ci_fulfilment.finish_email_job(
 p_session text,p_token uuid,p_now timestamptz,p_accepted boolean,
 p_provider_id text DEFAULT NULL,p_error text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SET search_path=''
AS $fn$
DECLARE
 v_job ci_fulfilment.email_jobs%rowtype;
BEGIN
 IF p_session IS NULL OR p_token IS NULL OR p_now IS NULL THEN RETURN false; END IF;
 SELECT * INTO v_job FROM ci_fulfilment.email_jobs
 WHERE session_id=p_session AND status='leased' AND lease_token=p_token
   AND lease_until>p_now FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_accepted AND length(coalesce(p_provider_id,''))>2 THEN
   UPDATE ci_fulfilment.email_jobs SET status='accepted',provider_id=p_provider_id,
     lease_token=NULL,lease_until=NULL,last_error=NULL WHERE session_id=p_session;
 ELSIF NOT p_accepted THEN
   UPDATE ci_fulfilment.email_jobs SET status=
       CASE WHEN attempts>=4 THEN 'dead' ELSE 'pending' END,
     next_attempt_at=p_now+make_interval(secs=>least(3600, 30 * power(2,least(attempts,6))::int)),
     lease_token=NULL,lease_until=NULL,last_error=left(coalesce(p_error,'unknown'),200)
   WHERE session_id=p_session;
 ELSE RETURN false;
 END IF;
 RETURN true;
END $fn$;

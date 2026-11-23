-- ISOLATED CI-ONLY DATABASE FIXTURE; NOT A SUPABASE MIGRATION.
-- PostgreSQL service container is disposable and contains no production data.
CREATE SCHEMA ci_fulfilment;

CREATE TABLE ci_fulfilment.receipts (
  session_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id text NOT NULL,
  amount_pence integer NOT NULL CHECK (amount_pence = 999),
  currency text NOT NULL CHECK (currency = 'gbp')
);
CREATE TABLE ci_fulfilment.entitlements (
  user_id uuid NOT NULL,
  course_id text NOT NULL,
  session_id text NOT NULL UNIQUE REFERENCES ci_fulfilment.receipts(session_id),
  PRIMARY KEY (user_id, course_id)
);
CREATE TABLE ci_fulfilment.outbox (
  session_id text PRIMARY KEY REFERENCES ci_fulfilment.receipts(session_id),
  status text NOT NULL DEFAULT 'pending'
);
CREATE OR REPLACE FUNCTION ci_fulfilment.record_paid_sandbox_order(
  p_session text, p_user uuid, p_course text
) RETURNS text
LANGUAGE plpgsql SET search_path = ''
AS $fn$
DECLARE
  v_record ci_fulfilment.receipts%rowtype;
  v_owner_session text;
BEGIN
  IF p_user IS NULL
     OR p_session !~ '^cs_test_[a-zA-Z0-9_-]+$'
     OR p_course !~ '^(built-up|tile-slate|metal-sheet|liquid-applied)-0[1-6]$'
  THEN RAISE EXCEPTION 'invalid sandbox order'; END IF;
  -- Only the webhook may supply independently verified paid order values.
  INSERT INTO ci_fulfilment.receipts (session_id,user_id,course_id,amount_pence,currency)
  VALUES(p_session,p_user,p_course,999,'gbp')
  ON CONFLICT (session_id) DO NOTHING;
  IF NOT FOUND THEN
    SELECT * INTO v_record FROM ci_fulfilment.receipts WHERE session_id=p_session FOR UPDATE;
    IF NOT FOUND OR v_record.user_id IS DISTINCT FROM p_user
        OR v_record.course_id IS DISTINCT FROM p_course
        OR v_record.amount_pence <> 999 OR v_record.currency <> 'gbp'
    THEN RAISE EXCEPTION 'receipt identity conflict'; END IF;
    RETURN 'already_recorded';
  END IF;

  INSERT INTO ci_fulfilment.entitlements(user_id,course_id,session_id)
  VALUES(p_user,p_course,p_session)
  ON CONFLICT (user_id,course_id) DO NOTHING;

  IF NOT FOUND THEN
    SELECT session_id INTO v_owner_session
      FROM ci_fulfilment.entitlements
     WHERE user_id=p_user AND course_id=p_course FOR UPDATE;
    IF v_owner_session IS DISTINCT FROM p_session
    THEN RAISE EXCEPTION 'already owned; different session'; END IF;
  END IF;

  INSERT INTO ci_fulfilment.outbox(session_id,status)
  VALUES(p_session,'pending') ON CONFLICT DO NOTHING;
  RETURN 'inserted';
END $fn$;

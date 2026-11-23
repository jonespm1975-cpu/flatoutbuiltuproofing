-- Supabase migration 20261123181441: already deployed and verified.
-- This file records the database change; committing it does not re-run it.
-- Stripe webhook writes a verified purchase-confirmations record only after
-- signature, line-item price, UK eligibility and consent validation.
-- Entitlements no longer wait for a transactional email provider.
CREATE OR REPLACE FUNCTION internal.grant_verified_live_course_on_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $f$
BEGIN
  IF left(NEW.stripe_checkout_session_id, 8) = 'cs_live_'
     AND NEW.course_id = 'beginner-training-course'
     AND NEW.paid_amount_pence = 999
     AND lower(NEW.currency) = 'gbp'
     AND NEW.terms_version = '2026-11-21-course-v1'
  THEN
    INSERT INTO public.course_access AS existing
      (user_id, course_id, stripe_checkout_session_id)
    VALUES
      (NEW.user_id, NEW.course_id, NEW.stripe_checkout_session_id)
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET stripe_checkout_session_id = excluded.stripe_checkout_session_id
      WHERE left(existing.stripe_checkout_session_id, 8) = 'cs_test_';
  END IF;
  RETURN NEW;
END;
$f$;

REVOKE ALL ON FUNCTION internal.grant_verified_live_course_on_receipt()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER grant_verified_live_course_on_receipt
AFTER INSERT ON public.purchase_confirmations
FOR EACH ROW
EXECUTE FUNCTION internal.grant_verified_live_course_on_receipt();

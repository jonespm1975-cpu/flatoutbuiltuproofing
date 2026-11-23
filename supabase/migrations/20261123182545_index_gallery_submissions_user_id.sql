-- Already applied in Supabase project fhyhshakmvqwzdyannec on 2026-11-23.
-- The gallery submissions user_id foreign key lacked a covering index.
-- No customer data or layout was changed.
CREATE INDEX IF NOT EXISTS gallery_submissions_user_id_idx
  ON public.gallery_submissions USING btree (user_id);

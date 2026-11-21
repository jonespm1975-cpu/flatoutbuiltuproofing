-- STAGING REVIEW ONLY: NOT APPLIED TO SUPABASE.
-- Dedicated private JSON storage; no public/anon/authenticated read policies.
-- Existing security/RLS settings and existing media buckets are unchanged.
-- Apply only after technical review and approval of deployment plan.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('paid-lessons-private','paid-lessons-private',false,3145728,ARRAY['application/json']::text[])
ON CONFLICT (id) DO NOTHING;
-- No storage.objects SELECT policy: service-role Edge Function only.
-- NEVER mark this bucket public or distribute signed raw file URLs.

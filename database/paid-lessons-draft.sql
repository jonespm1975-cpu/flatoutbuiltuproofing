-- DRAFT ONLY. Not deployed. Review and test in a separate Supabase environment.
-- Never expose service-role keys in browser code.
create table if not exists public.paid_lesson_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  purchased_at timestamptz not null default now(),
  access_ends_at timestamptz, -- NULL means lifetime while service operates
  revoked_at timestamptz,
  unique(user_id,lesson_id)
);
create index if not exists paid_lesson_entitlements_user_idx on public.paid_lesson_entitlements(user_id);
alter table public.paid_lesson_entitlements enable row level security;
revoke all on public.paid_lesson_entitlements from anon, authenticated;
grant select on public.paid_lesson_entitlements to authenticated;
drop policy if exists "Learners view own active entitlements" on public.paid_lesson_entitlements;
create policy "Learners view own active entitlements"
on public.paid_lesson_entitlements for select to authenticated
using (user_id = (select auth.uid()) and revoked_at is null and (access_ends_at is null or access_ends_at > now()));

create table if not exists public.course_purchase_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  lesson_id text not null,
  stripe_checkout_session_id text not null unique,
  consent_text_version text not null,
  consented_at timestamptz not null,
  confirmation_sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.course_purchase_consents enable row level security;
revoke all on public.course_purchase_consents from anon, authenticated;
-- Consent records are server-managed only; no direct browser access.
-- A trusted backend with service-role credentials should validate a Supabase
-- access token, lesson ID and unticked consent checkbox before creating Stripe
-- checkout. Persist a consent record linked to the checkout session.
-- Fulfil only from a signature-verified Stripe webhook after payment_status=paid,
-- with idempotent event handling and a durable transaction. Do not trust return URLs.
-- Check entitlement on the server before returning a signed, short-lived video URL.
-- Never publish paid lesson video URLs or secrets in a public GitHub repository.

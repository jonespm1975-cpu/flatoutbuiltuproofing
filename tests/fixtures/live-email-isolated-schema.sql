-- Disposable schema matching the current live email-queue routine's relevant fields.
-- Fictitious users and cs_live_mock_ order IDs ONLY. Never run against production.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA internal;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE TABLE public.purchase_confirmations (
 stripe_checkout_session_id text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 course_id text NOT NULL,
 paid_amount_pence integer NOT NULL,
 currency text NOT NULL,
 terms_version text NOT NULL,
 confirmation_email_status text NOT NULL DEFAULT 'pending',
 confirmation_email_sent_at timestamptz,
 confirmation_email_error text,
 consent_recorded_at timestamptz DEFAULT now()
);
CREATE TABLE public.course_access (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 course_id text NOT NULL,
 stripe_checkout_session_id text UNIQUE,
 created_at timestamptz DEFAULT now(),
 UNIQUE (user_id,course_id)
);
CREATE TABLE internal.live_purchase_email_outbox (
 stripe_checkout_session_id text PRIMARY KEY REFERENCES public.purchase_confirmations(stripe_checkout_session_id),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','leased','accepted','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid,
 lease_until timestamptz,
 provider_message_id text,
 last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((lease_token IS NULL) = (lease_until IS NULL)),
 CHECK ((status='leased') = (lease_token IS NOT NULL)),
 CHECK (status <> 'accepted' OR provider_message_id IS NOT NULL)
);

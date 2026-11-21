create table internal.live_membership_checkout_intents (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_price_id text not null check (stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  terms_version text not null check (terms_version ~ '^[A-Za-z0-9_.-]{1,80}$'),
  consent_recorded_at timestamptz not null default pg_catalog.now(),
  stripe_session_id text unique check (stripe_session_id ~ '^cs_live_[A-Za-z0-9]+$'),
  superseded_at timestamptz
);

create unique index live_membership_checkout_one_current_intent
  on internal.live_membership_checkout_intents (user_id) where superseded_at is null;

alter table internal.live_membership_checkout_intents enable row level security;
revoke all on internal.live_membership_checkout_intents from public, anon, authenticated;

create function public.reserve_live_membership_checkout(
  p_user uuid, p_price text, p_terms text, p_replace uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare intent internal.live_membership_checkout_intents%rowtype;
begin
  if p_user is null or p_price is null or p_price !~ '^price_[A-Za-z0-9]+$'
    or p_terms is null or p_terms !~ '^[A-Za-z0-9_.-]{1,80}$'
  then
    raise exception 'Invalid membership checkout reservation';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text, 71339441));
  if exists (
    select from public.membership_subscriptions
    where user_id = p_user and livemode
      and status not in ('canceled', 'incomplete_expired')
  ) then
    return pg_catalog.jsonb_build_object('state', 'existing_membership');
  end if;

  select * into intent from internal.live_membership_checkout_intents
    where user_id = p_user and superseded_at is null;
  if p_replace = intent.id and intent.stripe_session_id is not null then
    update internal.live_membership_checkout_intents set superseded_at = pg_catalog.now()
      where id = intent.id;
    intent := null;
  end if;
  if intent.id is null then
    insert into internal.live_membership_checkout_intents (user_id, stripe_price_id, terms_version)
      values (p_user, p_price, p_terms) returning * into intent;
  end if;
  return pg_catalog.jsonb_build_object(
    'state', 'reserved', 'id', intent.id, 'stripe_price_id', intent.stripe_price_id,
    'terms_version', intent.terms_version, 'consent_recorded_at', intent.consent_recorded_at,
    'stripe_session_id', intent.stripe_session_id,
    'retry_allowed', intent.consent_recorded_at > pg_catalog.now() - interval '20 hours'
  );
end;
$$;

create function public.record_live_membership_checkout(p_user uuid, p_intent uuid, p_session text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_session is null or p_session !~ '^cs_live_[A-Za-z0-9]+$' then
    raise exception 'Invalid live checkout session';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text, 71339441));
  update internal.live_membership_checkout_intents
    set stripe_session_id = p_session
    where id = p_intent and user_id = p_user and superseded_at is null
      and (stripe_session_id is null or stripe_session_id = p_session);
  return found;
end;
$$;

revoke execute on function public.reserve_live_membership_checkout(uuid,text,text,uuid) from public, anon, authenticated;
revoke execute on function public.record_live_membership_checkout(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_live_membership_checkout(uuid,text,text,uuid) to service_role;
grant execute on function public.record_live_membership_checkout(uuid,uuid,text) to service_role;

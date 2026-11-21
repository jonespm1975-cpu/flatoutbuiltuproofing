create table internal.live_membership_confirmation_outbox (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  stripe_subscription_id text not null unique references public.membership_subscriptions(stripe_subscription_id) on delete cascade,
  checkout_intent_id uuid not null unique references internal.live_membership_checkout_intents(id) on delete cascade,
  stripe_session_id text not null unique,
  recipient_email text not null,
  terms_version text not null,
  consent_recorded_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts integer not null default 0,
  first_attempt_at timestamptz,
  next_attempt_at timestamptz not null default pg_catalog.now(),
  lease_token uuid,
  lease_until timestamptz,
  provider_message_id text,
  sent_at timestamptz,
  last_outcome text
);

alter table internal.live_membership_confirmation_outbox enable row level security;
revoke all on internal.live_membership_confirmation_outbox from public, anon, authenticated;

create index live_membership_confirmation_due
  on internal.live_membership_confirmation_outbox (next_attempt_at, id) where status = 'pending';

create function public.sync_live_membership_order(
  p_payload jsonb, p_intent uuid, p_session text, p_terms text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  checkout internal.live_membership_checkout_intents%rowtype;
  recipient text;
  subscription_id text := p_payload->>'stripe_subscription_id';
begin
  select * into checkout from internal.live_membership_checkout_intents
    where id = p_intent and user_id = (p_payload->>'user_id')::uuid
      and stripe_session_id = p_session and stripe_price_id = p_payload->>'stripe_price_id'
      and terms_version = p_terms;
  if not found then return false; end if;

  perform public.apply_live_membership_sync(p_payload);

  if exists (
    select from internal.live_membership_confirmation_outbox
      where stripe_subscription_id = subscription_id and checkout_intent_id = checkout.id
  ) then return true; end if;

  select email into recipient from auth.users
    where id = checkout.user_id and email_confirmed_at is not null and not is_anonymous;
  if recipient is null or recipient = '' then
    raise exception 'Membership confirmation recipient unavailable';
  end if;
  insert into internal.live_membership_confirmation_outbox (
    stripe_subscription_id, checkout_intent_id, stripe_session_id, recipient_email, terms_version, consent_recorded_at
  ) values (
    subscription_id, checkout.id, checkout.stripe_session_id, recipient, checkout.terms_version, checkout.consent_recorded_at
  )
  on conflict (stripe_subscription_id) do nothing;
  if not exists (
    select from internal.live_membership_confirmation_outbox
      where stripe_subscription_id = subscription_id and checkout_intent_id = checkout.id
  ) then
    raise exception 'Membership confirmation order mismatch';
  end if;
  return true;
end;
$$;

create function public.claim_live_membership_confirmations(p_limit integer default 2)
returns table (
  job_id uuid, claim_token uuid, stripe_session_id text, recipient_email text,
  terms_version text, consent_recorded_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update internal.live_membership_confirmation_outbox as q
    set status = 'failed', lease_token = null, lease_until = null, last_outcome = 'retry-window-ended'
    where q.status = 'pending'
      and (q.lease_until is null or q.lease_until <= pg_catalog.now())
      and (q.attempts >= 5 or q.first_attempt_at <= pg_catalog.now() - interval '20 hours');

  return query
    with ready as (
      select q.id from internal.live_membership_confirmation_outbox as q
        where q.status = 'pending' and q.next_attempt_at <= pg_catalog.now()
          and (q.lease_until is null or q.lease_until <= pg_catalog.now())
        order by q.next_attempt_at, q.id
        limit greatest(0, least(coalesce(p_limit, 0), 5))
        for update skip locked
    )
    update internal.live_membership_confirmation_outbox as q
      set attempts = q.attempts + 1, first_attempt_at = coalesce(q.first_attempt_at, pg_catalog.now()),
          lease_token = pg_catalog.gen_random_uuid(), lease_until = pg_catalog.now() + interval '5 minutes'
      from ready where q.id = ready.id
      returning q.id, q.lease_token, q.stripe_session_id, q.recipient_email,
        q.terms_version, q.consent_recorded_at;
end;
$$;

create function public.finish_live_membership_confirmation(
  p_job uuid, p_token uuid, p_outcome text, p_provider_message_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_outcome is null or p_outcome not in ('sent','provider-retry','provider-rejected','template-unavailable')
    or (p_outcome = 'sent' and coalesce(p_provider_message_id, '') !~ '^[a-zA-Z0-9_-]{1,128}$')
  then return false; end if;

  update internal.live_membership_confirmation_outbox as q
    set status = case when p_outcome = 'sent' then 'sent'
          when p_outcome = 'provider-retry' and q.attempts < 5 then 'pending'
          else 'failed' end,
        provider_message_id = case when p_outcome = 'sent' then p_provider_message_id else null end,
        sent_at = case when p_outcome = 'sent' then pg_catalog.now() else null end,
        next_attempt_at = case when p_outcome = 'provider-retry'
          then pg_catalog.now() + pg_catalog.make_interval(mins => (2 ^ greatest(q.attempts - 1, 0))::integer)
          else q.next_attempt_at end,
        lease_token = null, lease_until = null, last_outcome = p_outcome
    where q.id = p_job and q.lease_token = p_token and q.lease_until > pg_catalog.now()
      and q.status = 'pending';
  return found;
end;
$$;

create or replace function public.has_active_membership()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select from public.membership_subscriptions m
      join internal.live_membership_confirmation_outbox q using (stripe_subscription_id)
      where m.user_id = (select auth.uid()) and m.livemode = true
        and m.status = 'active' and m.current_period_end > pg_catalog.now()
        and q.status = 'sent' and q.sent_at is not null
  )
$$;

revoke execute on function public.has_active_membership() from public, anon;
grant execute on function public.has_active_membership() to authenticated, service_role;

revoke execute on function public.sync_live_membership_order(jsonb,uuid,text,text) from public, anon, authenticated;
revoke execute on function public.claim_live_membership_confirmations(integer) from public, anon, authenticated;
revoke execute on function public.finish_live_membership_confirmation(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.sync_live_membership_order(jsonb,uuid,text,text) to service_role;
grant execute on function public.claim_live_membership_confirmations(integer) to service_role;
grant execute on function public.finish_live_membership_confirmation(uuid,uuid,text,text) to service_role;

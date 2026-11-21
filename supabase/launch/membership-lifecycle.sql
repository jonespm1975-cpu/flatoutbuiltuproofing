alter table public.membership_subscriptions
  add column last_live_sync_order bigint not null default 0;

create sequence internal.live_membership_sync_order;

create function public.begin_live_membership_sync()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select pg_catalog.nextval('internal.live_membership_sync_order'::regclass)
$$;

create function public.apply_live_membership_sync(payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscription_id text := payload->>'stripe_subscription_id';
  customer_id text := payload->>'stripe_customer_id';
  price_id text := payload->>'stripe_price_id';
  owner_id uuid := (payload->>'user_id')::uuid;
  membership_status text := payload->>'status';
  period_end timestamptz := (payload->>'current_period_end')::timestamptz;
  cancel_scheduled boolean := (payload->>'cancel_at_period_end')::boolean;
  event_created bigint := (payload->>'last_stripe_event_created')::bigint;
  sync_order bigint := (payload->>'sync_order')::bigint;
  existing public.membership_subscriptions%rowtype;
begin
  if subscription_id is null or subscription_id !~ '^sub_[A-Za-z0-9]+$'
    or customer_id is null or customer_id !~ '^cus_[A-Za-z0-9]+$'
    or price_id is null or price_id !~ '^price_[A-Za-z0-9]+$'
    or owner_id is null
    or membership_status is null
    or membership_status not in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')
    or period_end is null or not pg_catalog.isfinite(period_end)
    or cancel_scheduled is null
    or event_created is null or event_created <= 0
    or sync_order is null or sync_order <= 0
  then
    raise exception 'Invalid live membership sync';
  end if;

  insert into public.membership_subscriptions as membership (
    stripe_subscription_id, stripe_customer_id, stripe_price_id, user_id,
    status, current_period_end, cancel_at_period_end, last_stripe_event_created,
    updated_at, livemode, last_live_sync_order
  ) values (
    subscription_id, customer_id, price_id, owner_id,
    membership_status, period_end, cancel_scheduled, event_created,
    pg_catalog.now(), true, sync_order
  )
  on conflict (stripe_subscription_id) do update set
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    last_stripe_event_created = greatest(membership.last_stripe_event_created, excluded.last_stripe_event_created),
    updated_at = excluded.updated_at,
    last_live_sync_order = excluded.last_live_sync_order
  where membership.livemode
    and membership.user_id = excluded.user_id
    and membership.stripe_customer_id = excluded.stripe_customer_id
    and membership.stripe_price_id = excluded.stripe_price_id
    and membership.last_live_sync_order < excluded.last_live_sync_order;

  if found then return true; end if;

  select * into strict existing from public.membership_subscriptions
    where stripe_subscription_id = subscription_id;
  if not existing.livemode or existing.user_id <> owner_id
    or existing.stripe_customer_id <> customer_id or existing.stripe_price_id <> price_id
  then
    raise exception 'Live membership owner, price or mode mismatch';
  end if;
  return false;
end;
$$;

revoke execute on function public.begin_live_membership_sync() from public, anon, authenticated;
revoke execute on function public.apply_live_membership_sync(jsonb) from public, anon, authenticated;
grant execute on function public.begin_live_membership_sync() to service_role;
grant execute on function public.apply_live_membership_sync(jsonb) to service_role;

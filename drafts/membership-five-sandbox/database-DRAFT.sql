-- DRAFT ONLY. Do not apply until reviewed and tested in isolation.
begin;
create table internal.membership_five_test_checkout_leases (
 user_id uuid primary key, lease_token uuid not null, expires_at timestamptz not null, created_at timestamptz not null default now()
);
alter table internal.membership_five_test_checkout_leases enable row level security;
revoke all on internal.membership_five_test_checkout_leases from public, anon, authenticated;
create function public.claim_membership_five_test_checkout(p_user_id uuid,p_token uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare acquired boolean;
begin
 if p_user_id is null or p_token is null then return false; end if;
 insert into internal.membership_five_test_checkout_leases(user_id,lease_token,expires_at)
 values(p_user_id,p_token,now()+interval '35 minutes')
 on conflict(user_id) do update set lease_token=excluded.lease_token,expires_at=excluded.expires_at,created_at=now()
 where internal.membership_five_test_checkout_leases.expires_at<now()
 returning true into acquired;
 return coalesce(acquired,false);
end; $$;
revoke all on function public.claim_membership_five_test_checkout(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_membership_five_test_checkout(uuid,uuid) to service_role;
create function public.apply_membership_five_test_event(payload jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if payload->>'stripe_price_id' is distinct from 'price_1UfiBg3eiZFnd5l0Y7cs24MU'
 or coalesce(payload->>'stripe_subscription_id','') not like 'sub_%'
 or coalesce(payload->>'stripe_customer_id','') not like 'cus_%'
 or coalesce((payload->>'last_stripe_event_created')::bigint,0)<=0
 or coalesce(payload->>'status','') not in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')
 or payload->>'user_id' is null or payload->>'current_period_end' is null or payload->>'cancel_at_period_end' is null
 then raise exception 'Invalid five pound sandbox membership event'; end if;
 insert into public.membership_subscriptions(stripe_subscription_id,user_id,stripe_customer_id,stripe_price_id,status,current_period_end,cancel_at_period_end,last_stripe_event_created,updated_at,livemode)
 values(payload->>'stripe_subscription_id',(payload->>'user_id')::uuid,payload->>'stripe_customer_id',payload->>'stripe_price_id',payload->>'status',(payload->>'current_period_end')::timestamptz,(payload->>'cancel_at_period_end')::boolean,(payload->>'last_stripe_event_created')::bigint,now(),false)
 on conflict(stripe_subscription_id) do update set status=excluded.status,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,last_stripe_event_created=excluded.last_stripe_event_created,updated_at=now()
 where public.membership_subscriptions.livemode=false
 and public.membership_subscriptions.user_id=excluded.user_id
 and public.membership_subscriptions.stripe_customer_id=excluded.stripe_customer_id
 and public.membership_subscriptions.stripe_price_id=excluded.stripe_price_id
 and public.membership_subscriptions.last_stripe_event_created<=excluded.last_stripe_event_created;
end; $$;
revoke all on function public.apply_membership_five_test_event(jsonb) from public,anon,authenticated;
grant execute on function public.apply_membership_five_test_event(jsonb) to service_role;
commit;

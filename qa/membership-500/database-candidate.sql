-- Staged candidate only: apply in controlled QA after review.
-- Preserve the legacy £1.99 RPC and restrict the new RPC to the service role.
begin;
create or replace function public.apply_membership_500_qa_event(payload jsonb)
returns void language plpgsql security definer set search_path to ''
as $fn$
begin
 if payload is null or jsonb_typeof(payload) <> 'object'
 or payload->>'stripe_price_id' is distinct from 'price_1UfiBg3eiZFnd5l0Y7cs24MU'
 or coalesce(payload->>'stripe_subscription_id','') !~ '^sub_[A-Za-z0-9]+$'
 or coalesce(payload->>'stripe_customer_id','') !~ '^cus_[A-Za-z0-9]+$'
 or coalesce(payload->>'user_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 or coalesce(payload->>'last_stripe_event_created','') !~ '^[1-9][0-9]{0,17}$'
 or coalesce(payload->>'status','') not in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')
 or nullif(payload->>'current_period_end','') is null
 or jsonb_typeof(payload->'cancel_at_period_end') is distinct from 'boolean'
 then raise exception 'Invalid QA membership event'; end if;
 insert into public.membership_subscriptions as m
 (stripe_subscription_id,user_id,stripe_customer_id,stripe_price_id,status,current_period_end,cancel_at_period_end,last_stripe_event_created,updated_at,livemode)
 values(payload->>'stripe_subscription_id',(payload->>'user_id')::uuid,payload->>'stripe_customer_id',payload->>'stripe_price_id',payload->>'status',(payload->>'current_period_end')::timestamptz,(payload->>'cancel_at_period_end')::boolean,(payload->>'last_stripe_event_created')::bigint,now(),false)
 on conflict(stripe_subscription_id) do update set
 status=excluded.status,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,last_stripe_event_created=excluded.last_stripe_event_created,updated_at=now()
 where not m.livemode and m.user_id=excluded.user_id and m.stripe_customer_id=excluded.stripe_customer_id and m.stripe_price_id=excluded.stripe_price_id and m.last_stripe_event_created <= excluded.last_stripe_event_created;
 if exists(select 1 from public.membership_subscriptions m where m.stripe_subscription_id=payload->>'stripe_subscription_id' and (m.livemode or m.user_id is distinct from (payload->>'user_id')::uuid or m.stripe_customer_id is distinct from payload->>'stripe_customer_id' or m.stripe_price_id is distinct from payload->>'stripe_price_id')) then raise exception 'Subscription owner, price or mode mismatch'; end if;
end;
$fn$;
revoke all on function public.apply_membership_500_qa_event(jsonb) from public, anon, authenticated;
grant execute on function public.apply_membership_500_qa_event(jsonb) to service_role;
commit;

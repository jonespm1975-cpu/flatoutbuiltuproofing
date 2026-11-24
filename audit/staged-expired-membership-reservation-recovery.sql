-- Called only by trusted server after canonical Stripe session is verified expired, unpaid and subscription-free.
create function public.rotate_expired_membership_reservation(p_user_id uuid,p_old_key uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare k uuid;
begin
 if p_user_id is null or p_old_key is null then return null; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text||':membership:live',0));
 if exists(select 1 from public.membership_subscriptions where user_id=p_user_id and livemode) then return null; end if;
 update internal.live_membership_checkout_reservations set reservation_key=gen_random_uuid(),created_at=now()
 where user_id=p_user_id and reservation_key=p_old_key and created_at<now()-interval '62 minutes'
 returning reservation_key into k;
 return k;
end $$;
revoke all on function public.rotate_expired_membership_reservation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.rotate_expired_membership_reservation(uuid,uuid) to service_role;
grant update(reservation_key,created_at) on internal.live_membership_checkout_reservations to service_role;
create function public.enqueue_membership_confirmation(p_subscription_id text,p_invoice_id text,p_reservation_key uuid,p_next_payment_at timestamptz)
returns boolean language plpgsql security invoker set search_path='' as $$
declare member public.membership_subscriptions%rowtype; address text;
begin
 if coalesce(p_subscription_id,'') not like 'sub\_%' escape '\' or coalesce(p_invoice_id,'') not like 'in\_%' escape '\' or p_next_payment_at is null then return false; end if;
 select * into member from public.membership_subscriptions where stripe_subscription_id=p_subscription_id and livemode and status='active' and stripe_price_id='price_1UeNy2KeIprRDTKxLWoER0vk' and current_period_end>now();
 if not found or member.current_period_end is distinct from p_next_payment_at then return false; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(member.user_id::text||':membership:live',0));
 if not exists(select 1 from internal.membership_contract_consents c join internal.membership_contract_versions v using(version) where c.reservation_key=p_reservation_key and c.user_id=member.user_id and v.approved_at is not null) then return false; end if;
 select email into address from auth.users where id=member.user_id and email_confirmed_at is not null;
 if address is null or length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return false; end if;
 insert into internal.membership_confirmation_outbox(subscription_id,invoice_id,reservation_key,recipient,paid_pence,currency,next_payment_at)
 values(p_subscription_id,p_invoice_id,p_reservation_key,address,500,'gbp',p_next_payment_at) on conflict do nothing;
 return exists(select 1 from internal.membership_confirmation_outbox where subscription_id=p_subscription_id and invoice_id=p_invoice_id and reservation_key=p_reservation_key);
end $$;
revoke all on function public.enqueue_membership_confirmation(text,text,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.enqueue_membership_confirmation(text,text,uuid,timestamptz) to service_role;
-- Server-side caller must first validate the canonical Stripe first paid invoice and matching subscription.
-- auth.users email lookup uses a separate service-only RPC if invoker access is unavailable; never grant broad auth-table access to public clients.

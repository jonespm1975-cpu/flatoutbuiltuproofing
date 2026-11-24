drop function public.enqueue_membership_confirmation(text,text,uuid,timestamptz);
create function public.enqueue_membership_confirmation(p_subscription_id text,p_invoice_id text,p_reservation_key uuid,p_next_payment_at timestamptz,p_recipient text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare member public.membership_subscriptions%rowtype;
begin
 if coalesce(p_subscription_id,'') not like 'sub\_%' escape '\' or coalesce(p_invoice_id,'') not like 'in\_%' escape '\' or p_next_payment_at is null or p_recipient is null or length(p_recipient)>254 or p_recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return false; end if;
 select * into member from public.membership_subscriptions where stripe_subscription_id=p_subscription_id and livemode and status='active' and stripe_price_id='price_1UeNy2KeIprRDTKxLWoER0vk' and current_period_end>now();
 if not found or member.current_period_end is distinct from p_next_payment_at then return false; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(member.user_id::text||':membership:live',0));
 if not exists(select 1 from internal.membership_contract_consents c join internal.membership_contract_versions v using(version) where c.reservation_key=p_reservation_key and c.user_id=member.user_id and v.approved_at is not null) then return false; end if;
 insert into internal.membership_confirmation_outbox(subscription_id,invoice_id,reservation_key,recipient,paid_pence,currency,next_payment_at)
 values(p_subscription_id,p_invoice_id,p_reservation_key,p_recipient,500,'gbp',p_next_payment_at) on conflict do nothing;
 return exists(select 1 from internal.membership_confirmation_outbox where subscription_id=p_subscription_id and invoice_id=p_invoice_id and reservation_key=p_reservation_key and recipient=p_recipient);
end $$;
revoke all on function public.enqueue_membership_confirmation(text,text,uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.enqueue_membership_confirmation(text,text,uuid,timestamptz,text) to service_role;
-- Trusted edge function must obtain confirmed recipient from Supabase Auth Admin and verify the canonical first paid Stripe invoice before calling.
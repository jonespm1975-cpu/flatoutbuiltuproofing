-- Read-only snapshot from deployed database. For disposable tests only; never execute on production.
CREATE OR REPLACE FUNCTION public.apply_membership_event_and_confirmation(p_payload jsonb, p_first_invoice_id text, p_recipient text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare u uuid; k uuid; sid text; current_row public.membership_subscriptions%rowtype;
begin
 u:=(p_payload->>'user_id')::uuid;
 k:=(p_payload->>'reservation_key')::uuid;
 sid:=p_payload->>'stripe_subscription_id';
 if u is null or k is null or sid is null then raise exception 'Invalid membership mapping'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text||':membership:live',0));
 if not exists(select 1 from internal.membership_contract_consents c join internal.membership_contract_versions v using(version) where c.user_id=u and c.reservation_key=k and v.approved_at is not null and c.version='membership-2026-11-24-v1') then raise exception 'Verified membership consent missing'; end if;
 perform public.apply_membership_live_event(p_payload);
 if p_first_invoice_id is null then return true; end if;
 select * into current_row from public.membership_subscriptions where stripe_subscription_id=sid and livemode and user_id=u;
 if not found or current_row.status<>'active' or current_row.current_period_end<=now() then raise exception 'First invoice needs reconciliation'; end if;
 -- The trusted webhook verifies the canonical Stripe first invoice and confirmed Auth recipient.
 if not public.enqueue_membership_confirmation(sid,p_first_invoice_id,k,current_row.current_period_end,p_recipient) then raise exception 'Confirmation enqueue failed'; end if;
 return true;
end $function$;

CREATE OR REPLACE FUNCTION public.apply_membership_live_event(payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ declare e public.membership_subscriptions%rowtype; u uuid; begin
u:=(payload->>'user_id')::uuid;
if u is null or payload->>'stripe_price_id' is distinct from 'price_1UeNy2KeIprRDTKxLWoER0vk' or coalesce(payload->>'stripe_subscription_id','') not like 'sub_%' or coalesce(payload->>'stripe_customer_id','') not like 'cus_%' or coalesce((payload->>'last_stripe_event_created')::bigint,0)<=0 or coalesce(payload->>'status','') not in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused') then raise exception 'Invalid live membership'; end if;
perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text||':membership:live',0));
if not exists(select 1 from internal.live_membership_checkout_reservations where user_id=u and reservation_key=(payload->>'reservation_key')::uuid) then raise exception 'Reservation mismatch'; end if;
select * into e from public.membership_subscriptions where stripe_subscription_id=payload->>'stripe_subscription_id' for update;
if found then
if not e.livemode or e.user_id<>u or e.stripe_customer_id<>payload->>'stripe_customer_id' then raise exception 'Owner or mode mismatch'; end if;
if e.last_stripe_event_created>(payload->>'last_stripe_event_created')::bigint then return; end if;
if e.last_stripe_event_created=(payload->>'last_stripe_event_created')::bigint and e.status<>'active' and payload->>'status'='active' then raise exception 'Ambiguous event order; reconcile'; end if;
end if;
insert into public.membership_subscriptions(stripe_subscription_id,user_id,stripe_customer_id,stripe_price_id,status,current_period_end,cancel_at_period_end,last_stripe_event_created,updated_at,livemode)
values(payload->>'stripe_subscription_id',u,payload->>'stripe_customer_id',payload->>'stripe_price_id',payload->>'status',(payload->>'current_period_end')::timestamptz,(payload->>'cancel_at_period_end')::boolean,(payload->>'last_stripe_event_created')::bigint,now(),true)
on conflict(stripe_subscription_id) do update set status=excluded.status,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,last_stripe_event_created=excluded.last_stripe_event_created,updated_at=now() where public.membership_subscriptions.livemode and public.membership_subscriptions.user_id=u and public.membership_subscriptions.stripe_customer_id=excluded.stripe_customer_id and public.membership_subscriptions.last_stripe_event_created<=excluded.last_stripe_event_created;
end $function$;

CREATE OR REPLACE FUNCTION public.claim_membership_confirmation(p_limit integer)
 RETURNS TABLE(subscription_id text, invoice_id text, recipient text, paid_pence integer, currency text, next_payment_at timestamp with time zone, terms_version text, terms_text text, consented_at timestamp with time zone, claim_token uuid)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 with candidates as (
 select o.subscription_id from internal.membership_confirmation_outbox o
 join internal.membership_contract_consents c on c.reservation_key=o.reservation_key
 join internal.membership_contract_versions v on v.version=c.version
 where o.status='pending' and o.claim_token is null and v.approved_at is not null
 order by o.created_at,o.subscription_id limit greatest(0,least(coalesce(p_limit,0),1))
 for update of o skip locked
 ), claimed as (
 update internal.membership_confirmation_outbox o set status='claimed',claim_token=gen_random_uuid(),claimed_at=now()
 from candidates x where o.subscription_id=x.subscription_id returning o.*
 )
 select o.subscription_id,o.invoice_id,o.recipient,o.paid_pence,o.currency,o.next_payment_at,c.version,v.terms_text,c.consented_at,o.claim_token
 from claimed o join internal.membership_contract_consents c on c.reservation_key=o.reservation_key join internal.membership_contract_versions v on v.version=c.version;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_membership_confirmation(p_subscription_id text, p_invoice_id text, p_reservation_key uuid, p_next_payment_at timestamp with time zone, p_recipient text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end $function$;

CREATE OR REPLACE FUNCTION public.finish_membership_confirmation(p_subscription_id text, p_claim_token uuid, p_outcome text, p_provider_message_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if p_outcome is null or p_outcome not in ('accepted','review') or p_claim_token is null or (p_outcome='accepted' and coalesce(length(trim(p_provider_message_id)),0)=0) or (p_outcome='review' and p_provider_message_id is not null) then return false; end if;
 update internal.membership_confirmation_outbox set status=p_outcome,provider_message_id=p_provider_message_id,completed_at=now()
 where subscription_id=p_subscription_id and claim_token=p_claim_token and status='claimed';
 return found;
end $function$;

CREATE OR REPLACE FUNCTION public.has_active_membership()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$select exists(select 1 from public.membership_subscriptions m where m.user_id=(select auth.uid()) and m.livemode=true and m.status='active' and m.current_period_end>now())$function$;

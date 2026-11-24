alter table internal.membership_confirmation_outbox add column claim_token uuid, add column claimed_at timestamptz, add column completed_at timestamptz;
alter table internal.membership_confirmation_outbox add constraint membership_claim_guard check(status<>'claimed' or (claim_token is not null and claimed_at is not null));
grant update(status,claim_token,claimed_at,completed_at,provider_message_id) on internal.membership_confirmation_outbox to service_role;
create function public.claim_membership_confirmation(p_limit integer)
returns table(subscription_id text,invoice_id text,recipient text,paid_pence integer,currency text,next_payment_at timestamptz,terms_version text,terms_text text,consented_at timestamptz,claim_token uuid)
language sql security invoker set search_path='' as $$
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
$$;
create function public.finish_membership_confirmation(p_subscription_id text,p_claim_token uuid,p_outcome text,p_provider_message_id text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_outcome is null or p_outcome not in ('accepted','review') or p_claim_token is null or (p_outcome='accepted' and coalesce(length(trim(p_provider_message_id)),0)=0) or (p_outcome='review' and p_provider_message_id is not null) then return false; end if;
 update internal.membership_confirmation_outbox set status=p_outcome,provider_message_id=p_provider_message_id,completed_at=now()
 where subscription_id=p_subscription_id and claim_token=p_claim_token and status='claimed';
 return found;
end $$;
revoke all on function public.claim_membership_confirmation(integer),public.finish_membership_confirmation(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_membership_confirmation(integer),public.finish_membership_confirmation(text,uuid,text,text) to service_role;
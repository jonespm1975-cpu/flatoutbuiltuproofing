create table internal.membership_contract_versions (
 version text primary key, terms_text text not null check(length(terms_text)>100),
 approved_at timestamptz, created_at timestamptz not null default now()
);
create table internal.membership_contract_consents (
 reservation_key uuid primary key, user_id uuid not null references auth.users(id),
 version text not null references internal.membership_contract_versions(version),
 consented_at timestamptz not null default now(),
 immediate_supply boolean not null, recurring_consent boolean not null check(recurring_consent),
 cancellation_acknowledged boolean not null check(cancellation_acknowledged)
);
create table internal.membership_confirmation_outbox (
 subscription_id text primary key references public.membership_subscriptions(stripe_subscription_id),
 invoice_id text unique not null, reservation_key uuid not null references internal.membership_contract_consents(reservation_key),
 recipient text not null, paid_pence integer not null check(paid_pence=500),
 currency text not null check(currency='gbp'), next_payment_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','claimed','accepted','delivered','bounced','review')),
 created_at timestamptz not null default now(), provider_message_id text unique,
 check(status not in ('accepted','delivered','bounced') or provider_message_id is not null)
);
alter table internal.membership_contract_versions enable row level security;
alter table internal.membership_contract_consents enable row level security;
alter table internal.membership_confirmation_outbox enable row level security;
revoke all on internal.membership_contract_versions,internal.membership_contract_consents,internal.membership_confirmation_outbox from public,anon,authenticated;
grant select on internal.membership_contract_versions to service_role;
grant select,insert on internal.membership_contract_consents to service_role;
grant select,insert on internal.membership_confirmation_outbox to service_role;
create function public.record_membership_contract_consent(p_user_id uuid,p_reservation_key uuid,p_version text,p_immediate_supply boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_immediate_supply is distinct from true then return false; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text||':membership:live',0));
 if not exists(select 1 from internal.live_membership_checkout_reservations where user_id=p_user_id and reservation_key=p_reservation_key) then return false; end if;
 if not exists(select 1 from internal.membership_contract_versions where version=p_version and approved_at is not null) then return false; end if;
 insert into internal.membership_contract_consents(reservation_key,user_id,version,immediate_supply,recurring_consent,cancellation_acknowledged)
 values(p_reservation_key,p_user_id,p_version,true,true,true) on conflict(reservation_key) do nothing;
 return exists(select 1 from internal.membership_contract_consents where reservation_key=p_reservation_key and user_id=p_user_id and version=p_version);
end $$;
revoke all on function public.record_membership_contract_consent(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.record_membership_contract_consent(uuid,uuid,text,boolean) to service_role;
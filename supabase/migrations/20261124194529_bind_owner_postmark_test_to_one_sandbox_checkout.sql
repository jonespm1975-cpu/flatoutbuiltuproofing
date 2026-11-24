create table internal.owner_sandbox_receipt_test (
  singleton boolean primary key default true check (singleton),
  session_id text unique not null check (left(session_id,8)='cs_test_'),
  owner_id uuid not null,
  armed_at timestamptz not null default clock_timestamp(),
  nonce_hash text, request_id bigint, claimed_at timestamptz, provider_id uuid,
  delivered_at timestamptz, bounced_at timestamptz
);
alter table internal.owner_sandbox_receipt_test enable row level security;
revoke all on internal.owner_sandbox_receipt_test from public, anon, authenticated;

create function internal.dispatch_owner_sandbox_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
declare nonce text; sid text;
begin
  if left(new.stripe_checkout_session_id,8)<>'cs_test_' then return new; end if;
  nonce:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  update internal.owner_sandbox_receipt_test t
     set nonce_hash=encode(sha256(convert_to(nonce,'UTF8')),'hex')
    from public.purchase_confirmations c,public.course_checkout_reservations r,auth.users u
   where t.session_id=new.stripe_checkout_session_id and t.nonce_hash is null
     and t.armed_at between clock_timestamp()-interval '2 hours' and clock_timestamp()
     and c.stripe_checkout_session_id=t.session_id and c.user_id=t.owner_id
     and c.confirmed_at>=t.armed_at and c.terms_version='sandbox-test'
     and c.course_id='beginner-training-course' and c.currency='gbp' and c.paid_amount_pence=999
     and c.consent_recorded_at is not null and c.confirmation_email_status='pending'
     and r.stripe_session_id=t.session_id and r.user_id=t.owner_id and r.environment='test'
     and r.course_id=c.course_id and u.id=t.owner_id and u.email_confirmed_at is not null
   returning t.session_id into sid;
  if not found then return new; end if;
  update internal.owner_sandbox_receipt_test set request_id=net.http_post(
    url:='https://fhyhshakmvqwzdyannec.supabase.co/functions/v1/owner-sandbox-postmark-receipt',
    headers:=jsonb_build_object('x-owner-check',nonce),body:='{}'::jsonb,timeout_milliseconds:=25000)
   where session_id=sid;
  return new;
exception when others then
  raise warning 'Owner sandbox email dispatch requires inspection (%)',SQLSTATE;
  return new;
end $$;
revoke all on function internal.dispatch_owner_sandbox_receipt() from public,anon,authenticated;
create trigger dispatch_explicit_owner_sandbox_receipt after insert on public.sandbox_email_retry_queue
for each row execute function internal.dispatch_owner_sandbox_receipt();

create function public.claim_owner_sandbox_receipt(p_nonce text) returns text
language sql security definer set search_path='' as $$
 update internal.owner_sandbox_receipt_test set claimed_at=clock_timestamp()
 where nonce_hash=encode(sha256(convert_to(p_nonce,'UTF8')),'hex') and claimed_at is null
 and armed_at>=clock_timestamp()-interval '2 hours' returning session_id
$$;
create function public.finish_owner_sandbox_receipt(p_nonce text,p_id uuid) returns boolean
language sql security definer set search_path='' as $$
 with changed as (update internal.owner_sandbox_receipt_test set provider_id=p_id
 where nonce_hash=encode(sha256(convert_to(p_nonce,'UTF8')),'hex') and claimed_at is not null
 and provider_id is null and p_id is not null returning 1) select exists(select from changed)
$$;
create function public.record_owner_sandbox_receipt_event(p_id uuid,p_kind text,p_at timestamptz)
returns boolean language sql security definer set search_path='' as $$
 with changed as (update internal.owner_sandbox_receipt_test
 set delivered_at=case when p_kind='Delivery' then coalesce(delivered_at,p_at) else delivered_at end,
 bounced_at=case when p_kind='Bounce' then coalesce(bounced_at,p_at) else bounced_at end
 where provider_id=p_id and p_kind in ('Delivery','Bounce') and p_at is not null returning 1)
 select exists(select from changed)
$$;
revoke all on function public.claim_owner_sandbox_receipt(text),public.finish_owner_sandbox_receipt(text,uuid),public.record_owner_sandbox_receipt_event(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.claim_owner_sandbox_receipt(text),public.finish_owner_sandbox_receipt(text,uuid),public.record_owner_sandbox_receipt_event(uuid,text,timestamptz) to service_role;
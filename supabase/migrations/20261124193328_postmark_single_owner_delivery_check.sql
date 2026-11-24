create table internal.postmark_owner_check (
 singleton boolean primary key default true check (singleton),
 nonce_hash text not null, expires_at timestamptz not null,
 claimed_at timestamptz, provider_id uuid, delivered_at timestamptz, bounced_at timestamptz
);
alter table internal.postmark_owner_check enable row level security;
revoke all on internal.postmark_owner_check from public, anon, authenticated;
create function public.postmark_owner_check_event(p_action text,p_nonce text,p_id uuid,p_at timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_action='claim' then
  update internal.postmark_owner_check set claimed_at=clock_timestamp() where claimed_at is null and expires_at>clock_timestamp() and nonce_hash=encode(sha256(convert_to(p_nonce,'UTF8')),'hex');
 elsif p_action='accepted' then
  update internal.postmark_owner_check set provider_id=p_id where claimed_at is not null and provider_id is null and p_id is not null and nonce_hash=encode(sha256(convert_to(p_nonce,'UTF8')),'hex');
 elsif p_action='Delivery' then
  update internal.postmark_owner_check set delivered_at=coalesce(delivered_at,p_at) where provider_id=p_id and p_at is not null;
 elsif p_action='Bounce' then
  update internal.postmark_owner_check set bounced_at=coalesce(bounced_at,p_at) where provider_id=p_id and p_at is not null;
 else return false; end if;
 return found;
end $$;
revoke all on function public.postmark_owner_check_event(text,text,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.postmark_owner_check_event(text,text,uuid,timestamptz) to service_role;
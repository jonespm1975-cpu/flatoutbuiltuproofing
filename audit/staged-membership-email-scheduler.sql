-- Dedicated expiring one-use scheduler credentials. No reusable key in source or cron command.
create table internal.membership_scheduler_tokens (
 token_hash text primary key check(token_hash ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz not null,
 scope text not null check(scope in ('check_only'))
);
alter table internal.membership_scheduler_tokens enable row level security;
revoke all on internal.membership_scheduler_tokens from public,anon,authenticated;
grant select,delete on internal.membership_scheduler_tokens to service_role;
create function public.consume_membership_scheduler_token(p_hash text)
returns text language plpgsql security invoker set search_path='' as $$
declare granted_scope text;
begin
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then return null; end if;
 delete from internal.membership_scheduler_tokens where token_hash=p_hash and expires_at>now() returning scope into granted_scope;
 return granted_scope;
end $$;
revoke all on function public.consume_membership_scheduler_token(text) from public,anon,authenticated;
grant execute on function public.consume_membership_scheduler_token(text) to service_role;
create function internal.run_membership_confirmation_probe()
returns bigint language plpgsql security invoker set search_path='' as $$
declare ephemeral text; request_id bigint;
begin
 delete from internal.membership_scheduler_tokens where expires_at<=now();
 ephemeral:=encode(extensions.gen_random_bytes(32),'hex');
 insert into internal.membership_scheduler_tokens(token_hash,expires_at,scope)
 values(encode(extensions.digest(ephemeral,'sha256'),'hex'),now()+interval '2 minutes','check_only');
 select net.http_post(url:='https://fhyhshakmvqwzdyannec.supabase.co/functions/v1/membership-confirmation-worker',headers:=jsonb_build_object('Content-Type','application/json','x-fobur-worker-key',ephemeral,'x-fobur-check-only','true'),body:='{}'::jsonb,timeout_milliseconds:=10000) into request_id;
 return request_id;
end $$;
revoke all on function internal.run_membership_confirmation_probe() from public,anon,authenticated,service_role;
-- Only the database owner can schedule a check-only invocation. No send scope is implemented.

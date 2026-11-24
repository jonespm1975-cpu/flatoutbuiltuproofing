do $setup$
begin
  if not exists (select 1 from vault.secrets where name='fobur_postmark_confirmation_scheduler_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'fobur_postmark_confirmation_scheduler_key','Dedicated Postmark confirmation scheduler credential');
  end if;
end $setup$;
create function internal.dispatch_postmark_confirmations(p_check_only boolean default false)
returns bigint language plpgsql security invoker set search_path='' as $$
declare worker_key text;
begin
  if not p_check_only and not exists (
    select 1 from internal.future_contract_confirmation_jobs where status='pending' and attempts=0
  ) then return null; end if;
  select decrypted_secret into strict worker_key from vault.decrypted_secrets where name='fobur_postmark_confirmation_scheduler_key';
  return net.http_post(
    url:='https://fhyhshakmvqwzdyannec.supabase.co/functions/v1/future-contract-confirmation-worker',
    headers:=jsonb_build_object('x-fobur-worker-key',worker_key,'x-fobur-check-only',case when p_check_only then 'true' else 'false' end),
    body:='{}'::jsonb,timeout_milliseconds:=25000);
end $$;
revoke all on function internal.dispatch_postmark_confirmations(boolean) from public,anon,authenticated;
do $schedule$
declare job_id bigint;
begin
  job_id:=cron.schedule('fobur-postmark-course-confirmations','* * * * *','select internal.dispatch_postmark_confirmations(false)');
  perform cron.alter_job(job_id,active:=false);
end $schedule$;
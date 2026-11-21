create or replace function internal.dispatch_live_membership_confirmation_worker()
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  project_url text;
  worker_token text;
begin
  -- Include exhausted jobs so the worker can mark them for reconciliation.
  if not exists (
    select from internal.live_membership_confirmation_outbox q
      where q.status = 'pending'
        and (q.lease_until is null or q.lease_until <= pg_catalog.now())
        and (q.next_attempt_at <= pg_catalog.now() or q.attempts >= 5
          or q.first_attempt_at <= pg_catalog.now() - interval '20 hours')
  ) then
    return null;
  end if;

  begin
    select decrypted_secret into strict project_url from vault.decrypted_secrets
      where name = 'membership_live_confirmation_project_url';
    select decrypted_secret into strict worker_token from vault.decrypted_secrets
      where name = 'membership_live_confirmation_worker_token';
  exception when no_data_found or too_many_rows then
    raise exception 'Membership confirmation dispatcher configuration unavailable';
  end;

  if project_url is null or project_url !~ '^https://[a-z0-9]{20}[.]supabase[.]co$'
    or worker_token is null or worker_token !~ '^[a-zA-Z0-9_-]{32,128}$'
  then
    raise exception 'Membership confirmation dispatcher configuration invalid';
  end if;

  return net.http_post(
    url => project_url || '/functions/v1/membership-live-confirmation-worker',
    body => '{}'::jsonb,
    headers => pg_catalog.jsonb_build_object(
      'Authorization', 'Bearer ' || worker_token,
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds => 35000
  );
end;
$$;

revoke execute on function internal.dispatch_live_membership_confirmation_worker()
  from public, anon, authenticated, service_role;

do $$
declare
  job_name constant text := 'fobur-live-membership-confirmation-worker';
  job_schedule constant text := '* * * * *';
  job_command constant text := 'select internal.dispatch_live_membership_confirmation_worker();';
  existing cron.job%rowtype;
  job_id bigint;
begin
  select * into existing from cron.job where jobname = job_name and username = current_user;
  if found then
    if existing.schedule <> job_schedule or existing.command <> job_command then
      raise exception 'Review the existing membership confirmation schedule before replacing it';
    end if;
    return;
  end if;

  job_id := cron.schedule(job_name, job_schedule, job_command);
  -- Installed disabled in the same transaction, before Cron can see the job.
  perform cron.alter_job(job_id, active => false);
end;
$$;

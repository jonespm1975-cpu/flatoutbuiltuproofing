-- Separate specialist-course dispatch. No changes to existing beginner/membership schedules.
create or replace function internal.dispatch_specialist_confirmations(p_check_only boolean default false)
returns bigint
language plpgsql
security invoker
set search_path to ''
as $function$
declare worker_key text;
begin
  if p_check_only is null then raise exception 'Explicit dispatch mode required'; end if;
  if not p_check_only and not exists (
    select 1
    from internal.future_contract_confirmation_jobs q
    join public.purchase_confirmations c using(stripe_checkout_session_id)
    where q.status='pending' and q.attempts=0
      and c.confirmation_email_status='pending'
      and left(q.stripe_checkout_session_id,8)='cs_live_'
      and internal.is_specialist_confirmation_course(c.course_id,c.terms_version)
      and c.paid_amount_pence=999 and lower(c.currency)='gbp'
      and c.consent_recorded_at is not null
      and c.confirmed_at>=c.consent_recorded_at
      and exists(select 1 from public.course_access ca where ca.user_id=c.user_id and ca.course_id=c.course_id and ca.stripe_checkout_session_id=c.stripe_checkout_session_id)
      and exists(select 1 from internal.specialist_course_checkout_reservations sr where sr.user_id=c.user_id and sr.course_id=c.course_id and sr.stripe_session_id=c.stripe_checkout_session_id and sr.created_at=c.consent_recorded_at)
      and not exists(select 1 from internal.live_purchase_email_outbox prior where prior.stripe_checkout_session_id=q.stripe_checkout_session_id and prior.status in ('accepted','delivered'))
  ) then return null; end if;
  select decrypted_secret into strict worker_key from vault.decrypted_secrets where name='fobur_postmark_confirmation_scheduler_key';
  if worker_key is null or length(worker_key)=0 then raise exception 'Scheduler credential unavailable'; end if;
  return net.http_post(
    url:='https://fhyhshakmvqwzdyannec.supabase.co/functions/v1/specialist-postmark-confirmation-worker',
    headers:=jsonb_build_object('Content-Type','application/json','x-fobur-worker-key',worker_key,'x-fobur-check-only',case when p_check_only then 'true' else 'false' end),
    body:='{}'::jsonb,timeout_milliseconds:=25000);
end
$function$;
revoke all on function internal.dispatch_specialist_confirmations(boolean) from public, anon, authenticated, service_role;
-- The cron job executes as its creator (database administrator); worker enforces its own release flags and atomic claim.
select cron.schedule('fobur-postmark-specialist-confirmations','* * * * *',$cron$select internal.dispatch_specialist_confirmations(false);$cron$);

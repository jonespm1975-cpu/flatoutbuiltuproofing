create or replace function internal.enqueue_sandbox_purchase_confirmation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.terms_version='sandbox-test'
    and new.stripe_checkout_session_id like 'cs_test_%'
    and new.confirmation_email_status='pending' then
   insert into public.sandbox_email_retry_queue(stripe_checkout_session_id)
   values(new.stripe_checkout_session_id)
   on conflict (stripe_checkout_session_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function internal.enqueue_sandbox_purchase_confirmation() from public,anon,authenticated;
drop trigger if exists trg_enqueue_sandbox_purchase_confirmation on public.purchase_confirmations;
create trigger trg_enqueue_sandbox_purchase_confirmation
after insert on public.purchase_confirmations
for each row execute function internal.enqueue_sandbox_purchase_confirmation();
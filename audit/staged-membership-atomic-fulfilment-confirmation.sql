create function public.apply_membership_event_and_confirmation(p_payload jsonb,p_first_invoice_id text,p_recipient text)
returns boolean language plpgsql security invoker set search_path='' as $$
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
end $$;
revoke all on function public.apply_membership_event_and_confirmation(jsonb,text,text) from public,anon,authenticated;
grant execute on function public.apply_membership_event_and_confirmation(jsonb,text,text) to service_role;
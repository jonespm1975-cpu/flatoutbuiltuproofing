create function public.outstanding_course_orders(owner_view boolean default false)
returns table(order_reference text, paid_at timestamptz, needs_help boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or (owner_view and caller <> '87fca075-224a-4379-bafb-3a01e41890f4'::uuid) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  return query
  select right(p.stripe_checkout_session_id, 12), p.confirmed_at,
    case when q.status = 'pending' and q.attempts < 5 then false
         when q.status = 'leased' and (q.lease_until > now() or q.attempts < 5) then false
         else true end
  from public.purchase_confirmations p
  left join internal.live_purchase_email_outbox q using (stripe_checkout_session_id)
  where (owner_view or p.user_id = caller)
    and left(p.stripe_checkout_session_id, 8) = 'cs_live_'
    and p.course_id = 'beginner-training-course' and p.paid_amount_pence = 999 and p.currency = 'gbp'
    and not exists (select 1 from public.course_access a where a.user_id = p.user_id
      and a.course_id = p.course_id and left(a.stripe_checkout_session_id, 8) = 'cs_live_')
  order by p.confirmed_at desc;
end;
$$;
revoke all on function public.outstanding_course_orders(boolean) from public, anon, authenticated;
grant execute on function public.outstanding_course_orders(boolean) to authenticated;
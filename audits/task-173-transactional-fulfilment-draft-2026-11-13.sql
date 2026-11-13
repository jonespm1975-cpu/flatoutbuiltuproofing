-- TASK 173 REVIEW DRAFT ONLY. DO NOT APPLY TO PRODUCTION.
-- Caller MUST verify Stripe signature, paid state, live mode, exact price,
-- customer identity, consent and line items BEFORE invoking this RPC.
-- This function is not a substitute for verifying the payment server-side.
create or replace function public.fulfil_live_course_purchase_v1(
  p_session text, p_user uuid, p_course text, p_amount integer,
  p_currency text, p_consent_at timestamptz
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_receipt public.purchase_confirmations%rowtype;
begin
  if p_session is null or p_session not like 'cs_live_%'
     or p_user is null or p_course is distinct from 'beginner-training-course'
     or p_amount is distinct from 999 or p_currency is distinct from 'gbp'
     or p_consent_at is null then
    raise exception 'Invalid verified purchase input';
  end if;
  -- Serialise duplicate processing for the same Stripe session.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_session, 173));
  select * into v_receipt from public.purchase_confirmations
    where stripe_checkout_session_id=p_session for update;
  if found and (v_receipt.user_id<>p_user or v_receipt.course_id<>p_course
      or v_receipt.paid_amount_pence<>p_amount or v_receipt.currency<>p_currency) then
    raise exception 'Existing receipt conflict';
  end if;
  -- Do not overwrite an existing grant, including its original session.
  insert into public.course_access(user_id,course_id,stripe_checkout_session_id)
    values(p_user,p_course,p_session)
    on conflict (user_id,course_id) do nothing;
  insert into public.purchase_confirmations(
    stripe_checkout_session_id,user_id,course_id,paid_amount_pence,
    currency,consent_recorded_at)
    values(p_session,p_user,p_course,p_amount,p_currency,p_consent_at)
    on conflict (stripe_checkout_session_id) do nothing;
  -- Installed AFTER INSERT trigger enqueues pending live receipts atomically.
  -- Already-sent receipts are not reset and accepted jobs are not requeued.
  return true;
end $$;
-- REQUIRED BEFORE DEPLOYMENT:
-- revoke all on function public.fulfil_live_course_purchase_v1(
--   text,uuid,text,integer,text,timestamptz) from public,anon,authenticated;
-- grant execute on function public.fulfil_live_course_purchase_v1(
--   text,uuid,text,integer,text,timestamptz) to service_role;
-- Verify that default EXECUTE privileges do not expose the function during DDL.
-- Deploy via a single reviewed migration with explicit grants, not ad hoc SQL.

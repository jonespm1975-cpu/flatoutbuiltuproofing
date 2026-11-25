-- PROPOSAL ONLY: test on disposable PostgreSQL; not applied to production.
-- A verified provider callback records delivery only for an already accepted matching message.
CREATE OR REPLACE FUNCTION public.record_membership_confirmation_delivery(
 p_provider_message_id text, p_recipient text, p_event text, p_event_at timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $function$
DECLARE changed integer;
BEGIN
 IF nullif(btrim(p_provider_message_id),'') IS NULL
 OR nullif(btrim(p_recipient),'') IS NULL
 OR p_event IS NULL OR p_event NOT IN ('delivered','bounced')
 OR p_event_at IS NULL OR p_event_at > clock_timestamp()+interval '2 days'
 OR p_event_at < clock_timestamp()-interval '45 days' THEN RETURN false; END IF;
 UPDATE internal.membership_confirmation_outbox
 SET status=CASE WHEN status='bounced' OR p_event='bounced' THEN 'bounced' ELSE 'delivered' END
 WHERE provider_message_id=p_provider_message_id
 AND lower(recipient)=lower(p_recipient)
 AND status IN ('accepted','delivered','bounced');
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed=1;
END;
$function$;
REVOKE ALL ON FUNCTION public.record_membership_confirmation_delivery(text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_membership_confirmation_delivery(text,text,text,timestamptz) TO service_role;

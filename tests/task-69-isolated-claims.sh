#!/usr/bin/env bash
set -euo pipefail
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres PGDATABASE=postgres
psql -X -v ON_ERROR_STOP=1 -f tests/task-69-isolated-claims.sql
psql -X -v ON_ERROR_STOP=1 -Atc "BEGIN; SELECT claim_token FROM public.claim_test_course_confirmation_email('cs_test_atomic_fixture'); SELECT pg_sleep(4); COMMIT;" > /tmp/task69-winner.txt &
winner_pid=$!
sleep 1
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT claim_token FROM public.claim_test_course_confirmation_email('cs_test_atomic_fixture');" > /tmp/task69-loser.txt
wait "$winner_pid"
grep -Eq '[0-9a-f]{8}-[0-9a-f-]{27,}' /tmp/task69-winner.txt
test ! -s /tmp/task69-loser.txt
echo "PASS: two independent PostgreSQL connections yield exactly one claim winner"
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*)=1 FROM public.sandbox_email_retry_queue WHERE attempts=1 AND status='leased';" | grep -qx t
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT public.finish_test_course_confirmation_email('cs_test_atomic_fixture','00000000-0000-4000-8000-000000000000',true,'fake',null);" | grep -qx f
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*)=0 FROM public.claim_test_course_confirmation_email('cs_live_invalid');" | grep -qx t
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*)=0 FROM public.claim_test_course_confirmation_email('cs_test_atomic_fixture');" | grep -qx t
echo "PASS: invalid token, non-sandbox ID, and duplicate claim denied"
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT public.finish_test_course_confirmation_email('cs_test_atomic_fixture',lease_token,false,null,'provider_503') FROM public.sandbox_email_retry_queue WHERE stripe_checkout_session_id='cs_test_atomic_fixture';" | grep -qx t
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT status='pending' AND attempts=1 AND next_attempt_at>now() AND last_error='provider_503' FROM public.sandbox_email_retry_queue;" | grep -qx t
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*)=0 FROM public.claim_test_course_confirmation_email('cs_test_atomic_fixture');" | grep -qx t
echo "PASS: failed send releases lease with future backoff; immediate retry denied"
psql -X -v ON_ERROR_STOP=1 -c "UPDATE public.sandbox_email_retry_queue SET next_attempt_at=now()-interval '1 minute';"
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*)=1 FROM public.claim_test_course_confirmation_email('cs_test_atomic_fixture');" | grep -qx t
psql -X -v ON_ERROR_STOP=1 -c "UPDATE public.sandbox_email_retry_queue SET lease_until=now()-interval '1 minute';"
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*)=1 FROM public.claim_test_course_confirmation_email('cs_test_atomic_fixture');" | grep -qx t
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT public.finish_test_course_confirmation_email('cs_test_atomic_fixture',lease_token,true,'provider-fixture-id',null) FROM public.sandbox_email_retry_queue;" | grep -qx t
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*)=1 FROM public.purchase_confirmations WHERE confirmation_email_status='sent';" | grep -qx t
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*)=0 FROM public.claim_test_course_confirmation_email('cs_test_atomic_fixture');" | grep -qx t
echo "PASS: expired lease reclaimed; accepted finish closes claims"
# Task 72: stale tokens, expiry, attempt ceiling, and protected access invariant.
psql -X -v ON_ERROR_STOP=1 -c "CREATE TABLE public.course_access(user_id uuid,course_id text,PRIMARY KEY(user_id,course_id)); INSERT INTO public.course_access VALUES ('11111111-1111-4111-8111-111111111111','existing-entitlement');"
psql -X -v ON_ERROR_STOP=1 -c "INSERT INTO public.purchase_confirmations VALUES ('cs_test_task72','sandbox-test','pending',null,null); INSERT INTO public.sandbox_email_retry_queue(stripe_checkout_session_id,status) VALUES ('cs_test_task72','pending');"
old_token=$(psql -X -v ON_ERROR_STOP=1 -Atc "SELECT claim_token FROM public.claim_test_course_confirmation_email('cs_test_task72');")
test -n "$old_token"
psql -X -v ON_ERROR_STOP=1 -c "UPDATE public.sandbox_email_retry_queue SET lease_until=now()-interval '1 minute' WHERE stripe_checkout_session_id='cs_test_task72';"
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT public.finish_test_course_confirmation_email('cs_test_task72','$old_token',true,'provider-old',null);" | grep -qx f
new_token=$(psql -X -v ON_ERROR_STOP=1 -Atc "SELECT claim_token FROM public.claim_test_course_confirmation_email('cs_test_task72');")
test -n "$new_token" && test "$new_token" != "$old_token"
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT public.finish_test_course_confirmation_email('cs_test_task72','$old_token',true,'provider-stale',null);" | grep -qx f
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT public.finish_test_course_confirmation_email('cs_test_task72','$new_token',true,'',null);" | grep -qx f
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT public.finish_test_course_confirmation_email('cs_test_task72','$new_token',true,'provider-valid',null);" | grep -qx t
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT public.finish_test_course_confirmation_email('cs_test_task72','$new_token',true,'provider-duplicate',null);" | grep -qx f
echo "PASS: expired and stale tokens rejected; replacement token accepted once; provider ID required"
psql -X -v ON_ERROR_STOP=1 -c "INSERT INTO public.purchase_confirmations VALUES ('cs_test_task72_limit','sandbox-test','pending',null,null); INSERT INTO public.sandbox_email_retry_queue(stripe_checkout_session_id,status,attempts) VALUES ('cs_test_task72_limit','pending',5);"
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*)=0 FROM public.claim_test_course_confirmation_email('cs_test_task72_limit');" | grep -qx t
psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*)=1 FROM public.course_access WHERE user_id='11111111-1111-4111-8111-111111111111' AND course_id='existing-entitlement';" | grep -qx t
echo "PASS: retry ceiling enforced; existing synthetic entitlement preserved"

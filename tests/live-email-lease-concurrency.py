"""Ephemeral PostgreSQL two-connection tests of a 2026-11-21 live RPC source snapshot.

Requires DATABASE_URL pointing ONLY to GitHub Actions' disposable PostgreSQL.
Uses fictional identifiers. No Stripe, Supabase or Resend API requests.
"""
from __future__ import annotations

import os
import pathlib
import threading
import time
import uuid

import psycopg

DSN = os.environ["DATABASE_URL"]
SCHEMA = pathlib.Path("tests/fixtures/live-email-isolated-schema.sql")
ROUTINES = pathlib.Path("tests/fixtures/live-email-rpcs-20261121.sql")
COURSE = "beginner-training-course"
TERMS = "2026-11-21-course-v1"


def connect():
    return psycopg.connect(DSN)


def query(sql, args=None):
    with connect() as conn:
        return conn.execute(sql, args).fetchall()


def seed(session: str, user: uuid.UUID, course: str = COURSE):
    with connect() as conn:
        conn.execute("INSERT INTO auth.users(id) VALUES (%s) ON CONFLICT DO NOTHING", (user,))
        conn.execute(
            """INSERT INTO public.purchase_confirmations
             (stripe_checkout_session_id,user_id,course_id,paid_amount_pence,currency,terms_version,confirmation_email_status)
             VALUES (%s,%s,%s,999,'gbp',%s,'pending')""",
            (session, user, course, TERMS),
        )
        conn.execute(
            """INSERT INTO internal.live_purchase_email_outbox
              (stripe_checkout_session_id,status,attempts,next_attempt_at)
              VALUES (%s,'pending',0,now()-interval '1 minute')""",
            (session,),
        )


def claim(conn, limit=1):
    return conn.execute("SELECT * FROM public.claim_live_purchase_email_retry(%s)", (limit,)).fetchall()


def finish(conn, session, token, accepted, provider=None, error=None):
    return conn.execute(
        "SELECT public.finish_live_purchase_email_retry(%s,%s,%s,%s,%s)",
        (session, token, accepted, provider, error),
    ).fetchone()[0]


def state(session):
    return query(
        """SELECT q.status,q.attempts,q.provider_message_id,c.confirmation_email_status
         FROM internal.live_purchase_email_outbox q
         JOIN public.purchase_confirmations c USING (stripe_checkout_session_id)
         WHERE q.stripe_checkout_session_id=%s""",
        (session,),
    )[0]


def access_count(session):
    return query(
        "SELECT count(*) FROM public.course_access WHERE stripe_checkout_session_id=%s",
        (session,),
    )[0][0]


def main():
    with connect() as conn:
        conn.execute(SCHEMA.read_text(encoding="utf-8"))
        conn.execute(ROUTINES.read_text(encoding="utf-8"))

    primary = "cs_live_mock_concurrency_01"
    buyer = uuid.UUID("11111111-1111-4111-8111-111111111111")
    seed(primary, buyer)
    a = connect()
    try:
        first = claim(a)
        assert len(first) == 1 and first[0][0] == primary, first
        token1 = first[0][2]
        assert first[0][1] == 1 and token1 is not None
        competing = {}
        def second_connection():
            started = time.monotonic()
            try:
                with connect() as b:
                    b.execute("SET LOCAL statement_timeout = '2500ms'")
                    competing["rows"] = claim(b)
                    competing["duration"] = time.monotonic() - started
            except Exception as exc:
                competing["exception"] = repr(exc)
        thread = threading.Thread(target=second_connection)
        thread.start()
        thread.join(5)
        assert not thread.is_alive(), "Competing worker blocked instead of skipping locked record"
        assert "exception" not in competing, competing
        assert competing["rows"] == [] and competing["duration"] < 2.5, competing
        a.commit()
        print("PASS 1/9: TWO real connections; locked email job was skipped")

        assert query("SELECT count(*) FROM public.claim_live_purchase_email_retry(1)")[0][0] == 0
        assert finish(a, primary, uuid.uuid4(), True, "fake_provider_wrong_token") is False
        a.commit()
        assert state(primary)[0] == "leased"
        print("PASS 2/9: lease prevents duplicate claims and rejects wrong token")

        # Simulate Resend failing to accept the message. This reproduces the
        # existing design defect: no entitlement while provider is unavailable.
        assert finish(a, primary, token1, False, None, "synthetic provider outage") is True
        a.commit()
        assert state(primary)[:2] == ("pending", 1)
        assert access_count(primary) == 0
        print("PASS 3/9: current code couples paid access to provider acceptance (known defect)")

        with connect() as updater:
            updater.execute(
                "UPDATE internal.live_purchase_email_outbox SET next_attempt_at=now()-interval '1 minute' WHERE stripe_checkout_session_id=%s",
                (primary,),
            )
        retry = claim(a)
        assert len(retry) == 1 and retry[0][1] == 2 and retry[0][2] != token1
        token2 = retry[0][2]
        a.commit()
        print("PASS 4/9: retry acquired fresh lease with incremented attempt number")

        assert finish(a, primary, token1, True, "stale_provider_id") is False
        assert finish(a, primary, token2, True, "synthetic_provider_accepted") is True
        a.commit()
        assert state(primary) == ("accepted", 2, "synthetic_provider_accepted", "sent")
        assert access_count(primary) == 1
        print("PASS 5/9: stale completion rejected; valid acceptance grants one entitlement")

        assert finish(a, primary, token2, True, "synthetic_provider_accepted") is False
        a.commit()
        assert access_count(primary) == 1
        assert query("SELECT count(*) FROM public.claim_live_purchase_email_retry(1)")[0][0] == 0
        print("PASS 6/9: finishing twice cannot send/re-grant an accepted job")

        # Existing sandbox lesson ownership becomes legitimate live access.
        old_user = uuid.UUID("22222222-2222-4222-8222-222222222222")
        moved = "cs_live_mock_replace_sandbox"
        seed(moved, old_user)
        with connect() as c:
            c.execute(
                "INSERT INTO public.course_access(user_id,course_id,stripe_checkout_session_id) VALUES(%s,%s,%s)",
                (old_user, COURSE, "cs_test_old_fixture"),
            )
            one = claim(c)
            assert one and one[0][0] == moved
            assert finish(c, moved, one[0][2], True, "synthetic_provider_b") is True
        assert query(
            "SELECT stripe_checkout_session_id FROM public.course_access WHERE user_id=%s",
            (old_user,),
        ) == [(moved,)]
        print("PASS 7/9: accepted live order upgrades prior sandbox-only access")

        exhausted = "cs_live_mock_exhausted_retries"
        seed(exhausted, uuid.UUID("33333333-3333-4333-8333-333333333333"))
        with connect() as c:
            c.execute(
                "UPDATE internal.live_purchase_email_outbox SET attempts=4 WHERE stripe_checkout_session_id=%s",
                (exhausted,),
            )
            one = claim(c)
            assert one and one[0][1] == 5
            assert finish(c, exhausted, one[0][2], False, None, "synthetic fifth failure")
        assert state(exhausted)[:2] == ("failed", 5)
        assert access_count(exhausted) == 0
        assert query("SELECT * FROM public.claim_live_purchase_email_retry(5)") == []
        print("PASS 8/9: fifth error stops automatic retries (paid access remains locked)")

        priv = query("""SELECT
           has_function_privilege('anon','public.claim_live_purchase_email_retry(integer)','EXECUTE'),
           has_function_privilege('authenticated','public.claim_live_purchase_email_retry(integer)','EXECUTE'),
           has_function_privilege('service_role','public.claim_live_purchase_email_retry(integer)','EXECUTE'),
           has_function_privilege('anon','public.finish_live_purchase_email_retry(text,uuid,boolean,text,text)','EXECUTE'),
           has_function_privilege('authenticated','public.finish_live_purchase_email_retry(text,uuid,boolean,text,text)','EXECUTE'),
           has_function_privilege('service_role','public.finish_live_purchase_email_retry(text,uuid,boolean,text,text)','EXECUTE')""")[0]
        assert priv == (False, False, True, False, False, True), priv
        print("PASS 9/9: claim/finish functions are service-role-only")

    finally:
        a.close()
    print("ISOLATED TEST FINISHED — no production database, payments or emails touched")


if __name__ == "__main__":
    main()

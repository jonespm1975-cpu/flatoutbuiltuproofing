"""Isolated candidate payment/receipt decoupling tests — NO production services.

Runs the captured deployed email claim RPC plus the NOT-DEPLOYED SQL proposal
in a disposable PostgreSQL service, with synthetic orders and two connections.
No Stripe, Resend, or Supabase HTTP requests. No real customer data.
"""
from __future__ import annotations

import datetime as dt
import os
import pathlib
import threading
import uuid

import psycopg

DSN = os.environ["DATABASE_URL"]
COURSE = "beginner-training-course"
TERMS = "2026-11-21-course-v1"
PRICE = "price_1UaRJvKeIprRDTKxKDawW6ZG"
START = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)


def db():
    return psycopg.connect(DSN)


def query(sql, params=None):
    with db() as c:
        return c.execute(sql, params).fetchall()


def user(n):
    return uuid.UUID(f"00000000-0000-4000-8000-{n:012d}")


def add_user(buyer):
    with db() as c:
        c.execute("INSERT INTO auth.users(id) VALUES(%s) ON CONFLICT DO NOTHING", (buyer,))


def record(c, session, buyer, *, course=COURSE, amount=999, currency="gbp",
           price=PRICE, country="GB", terms=TERMS, consent=START):
    return c.execute(
        """SELECT public.record_verified_live_course_purchase(
           %s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (session,buyer,course,amount,currency,price,country,terms,consent),
    ).fetchone()[0]


def claim(c):
    return c.execute("SELECT * FROM public.claim_live_purchase_email_retry(1)").fetchall()


def finish(c, session, token, accepted, provider=None, err=None):
    return c.execute("SELECT public.finish_live_purchase_email_retry(%s,%s,%s,%s,%s)",
                     (session,token,accepted,provider,err)).fetchone()[0]


def status(session):
    return query(
      """SELECT c.confirmation_email_status,q.status,q.attempts,q.provider_message_id
         FROM public.purchase_confirmations c
         JOIN internal.live_purchase_email_outbox q USING(stripe_checkout_session_id)
         WHERE c.stripe_checkout_session_id=%s""", (session,))[0]


def rows(session):
    return query(
      """SELECT (SELECT count(*) FROM public.purchase_confirmations WHERE stripe_checkout_session_id=%s),
                (SELECT count(*) FROM internal.live_purchase_email_outbox WHERE stripe_checkout_session_id=%s),
                (SELECT count(*) FROM public.course_access WHERE stripe_checkout_session_id=%s)""",
      (session,session,session))[0]


def main():
    # Same disposable PostgreSQL schema as the previous source-snapshot test.
    with db() as c:
        c.execute(pathlib.Path("tests/fixtures/live-email-isolated-schema.sql").read_text())
        c.execute(pathlib.Path("tests/fixtures/live-email-rpcs-20261121.sql").read_text())
        c.execute(pathlib.Path("proposals/live-payment-email-decoupling-NOT-DEPLOYED.sql").read_text())

    buyer = user(1)
    add_user(buyer)
    order = "cs_live_mock_decouple_01"
    with db() as c:
        assert record(c,order,buyer) == "recorded"
    assert rows(order) == (1,1,1), rows(order)
    assert status(order) == ("pending","pending",0,None), status(order)
    print("PASS 1: verified paid order creates access plus a separate unsent receipt")

    with db() as c:
        assert record(c,order,buyer) == "already_recorded"
    assert rows(order) == (1,1,1)
    print("PASS 2: same signed event is idempotent")

    # The proposed RPC rejects a conflicting user on the same Stripe session.
    foreign = user(2)
    add_user(foreign)
    with db() as c:
        try:
            record(c,order,foreign)
            raise AssertionError("Accepted a second owner for the same payment")
        except psycopg.Error:
            c.rollback()
    assert rows(order) == (1,1,1)
    print("PASS 3: mismatched buyer cannot claim a recorded order")

    with db() as c:
        first = claim(c)
        assert len(first)==1 and first[0][0]==order
        token = first[0][2]
    with db() as c:
        assert finish(c,order,token,False,None,"synthetic Resend outage")
    assert rows(order)==(1,1,1)
    assert status(order)[:3]==("pending","pending",1)
    print("PASS 4: provider outage preserves paid access")

    for expected_attempt in range(2,6):
        with db() as c:
            c.execute("""UPDATE internal.live_purchase_email_outbox
                SET next_attempt_at=now()-interval '1 minute'
                WHERE stripe_checkout_session_id=%s""", (order,))
            job=claim(c)
            assert len(job)==1 and job[0][0]==order and job[0][1]==expected_attempt
            assert finish(c,order,job[0][2],False,None,"synthetic Resend outage")
    assert status(order)[:3]==("pending","failed",5)
    assert rows(order)==(1,1,1)
    print("PASS 5: five failed receipt sends NEVER revoke or block course access")

    accepted = "cs_live_mock_decouple_02"
    with db() as c:
        assert record(c,accepted,buyer) == "recorded"
        job=claim(c)
        assert len(job)==1 and job[0][0]==accepted
        token=job[0][2]
        assert finish(c,accepted,token,True,"synthetic_provider_id") is True
        assert finish(c,accepted,token,True,"synthetic_provider_id") is False
    assert status(accepted)==("sent","accepted",1,"synthetic_provider_id")
    assert rows(accepted)==(1,1,0)  # Existing first live purchase remains canonical entitlement
    assert rows(order)==(1,1,1)
    print("PASS 6: provider acceptance changes email state, not existing live ownership")

    # Validate that the candidate cannot process malformed 'paid' evidence.
    invalids = [
      {"price":"price_wrong"}, {"amount":199}, {"country":"US"},
      {"currency":"usd"}, {"course":"membership"}, {"terms":"sandbox-test"},
      {"consent":START+dt.timedelta(days=1)}
    ]
    for i,kwargs in enumerate(invalids,1):
        sid=f"cs_live_mock_invalid_{i}"
        with db() as c:
            try:
                record(c,sid,foreign,**kwargs)
                raise AssertionError(f"Invalid payment attributes were accepted: {kwargs}")
            except psycopg.Error:
                c.rollback()
        assert rows(sid)==(0,0,0), (sid,rows(sid))
    print("PASS 7: price, amount, country, currency, course, terms and consent guards reject invalid input")

    add_user(user(3))
    missing_sid="cs_live_mock_unknown_buyer"
    with db() as c:
        try:
            record(c,missing_sid,user(999))
            raise AssertionError("Accepted unknown buyer")
        except psycopg.Error:
            c.rollback()
    assert rows(missing_sid)==(0,0,0)
    print("PASS 8: unknown account rejected transactionally")

    sandbox_user=user(4)
    add_user(sandbox_user)
    with db() as c:
        c.execute("""INSERT INTO public.course_access(user_id,course_id,stripe_checkout_session_id)
                     VALUES(%s,%s,'cs_test_owned_before')""",(sandbox_user,COURSE))
        assert record(c,"cs_live_mock_upgrade",sandbox_user)=="recorded"
    assert rows("cs_live_mock_upgrade") == (1,1,1)
    print("PASS 9: existing sandbox-only entitlement becomes live entitlement")

    # Exercise actual simultaneous independent DB transactions (not serialized tool calls).
    racing_sid="cs_live_mock_concurrent"
    racer=user(5)
    add_user(racer)
    barrier=threading.Barrier(2)
    outcome=[]
    errors=[]
    def call():
        try:
            with db() as c:
                c.execute("SET LOCAL statement_timeout='5000ms'")
                barrier.wait(timeout=5)
                outcome.append(record(c,racing_sid,racer))
        except Exception as e:
            errors.append(repr(e))
    t1=threading.Thread(target=call);t2=threading.Thread(target=call)
    t1.start();t2.start();t1.join(8);t2.join(8)
    assert not t1.is_alive() and not t2.is_alive(), "Database concurrency deadlock"
    assert not errors, errors
    assert sorted(outcome)==["already_recorded","recorded"],outcome
    assert rows(racing_sid)==(1,1,1)
    print("PASS 10: TWO independent concurrent transactions create exactly one purchase, queue, entitlement")

    priv=query("""SELECT
      has_function_privilege('anon','public.record_verified_live_course_purchase(text,uuid,text,integer,text,text,text,text,timestamptz)','EXECUTE'),
      has_function_privilege('authenticated','public.record_verified_live_course_purchase(text,uuid,text,integer,text,text,text,text,timestamptz)','EXECUTE'),
      has_function_privilege('service_role','public.record_verified_live_course_purchase(text,uuid,text,integer,text,text,text,text,timestamptz)','EXECUTE')""")[0]
    assert priv==(False,False,True),priv
    print("PASS 11: payment-recording RPC callable only by service role")

    assert query("SELECT count(*) FROM public.course_access")[0][0]==3
    print("PASS 12: no duplicate live entitlements (one per eligible buyer/course)")
    print("12/12 ISOLATED CHECKS PASSED — NO LIVE BILLING OR DATA TOUCHED")


if __name__ == "__main__":
    main()

"""Two-connection tests for STAGED live checkout reservation migration in disposable Postgres.
Never connect to production Supabase.
"""
import os, pathlib, threading, time, uuid
from datetime import datetime, timedelta, timezone
import psycopg

dsn = os.environ["DATABASE_URL"]
assert "disposable" in dsn and "localhost" in dsn
migration = pathlib.Path("supabase/migrations/20261123200800_live_course_checkout_reservation_phase1.sql").read_text()

def db():
    conn=psycopg.connect(dsn,connect_timeout=5)
    conn.execute("SET lock_timeout='8s'")
    return conn

def uid(): return str(uuid.uuid4())
COURSE="beginner-training-course"
def reserve(conn,buyer):
    return conn.execute("SELECT public.reserve_live_course_checkout(%s,%s)",(buyer,COURSE)).fetchone()[0]
def finalize(conn,buyer,key,session,expires=None):
    return conn.execute(
      "SELECT public.finalize_live_course_checkout(%s,%s,%s,%s,%s,%s)",
      (buyer,COURSE,key,session,"https://checkout.stripe.com/c/pay/fixture",
       expires or datetime.now(timezone.utc)+timedelta(minutes=30))).fetchone()[0]
def rows(conn,buyer):
    return conn.execute("SELECT count(*) FROM internal.live_course_checkout_reservations WHERE user_id=%s",(buyer,)).fetchone()[0]

with db() as conn:
    for role in ("anon","authenticated","service_role"):
        conn.execute("CREATE ROLE "+role+" NOLOGIN")
    conn.execute("CREATE SCHEMA auth")
    conn.execute("CREATE SCHEMA internal")
    conn.execute("CREATE TABLE auth.users(id uuid PRIMARY KEY)")
    conn.execute("""CREATE TABLE public.course_access(
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid, course_id text, stripe_checkout_session_id text)""")
    conn.execute("""CREATE TABLE public.purchase_confirmations(
      user_id uuid,course_id text,stripe_checkout_session_id text)""")
    conn.execute(migration)
    acl=conn.execute("""SELECT
     has_function_privilege('anon','public.reserve_live_course_checkout(uuid,text)','EXECUTE'),
     has_function_privilege('authenticated','public.reserve_live_course_checkout(uuid,text)','EXECUTE'),
     has_function_privilege('service_role','public.reserve_live_course_checkout(uuid,text)','EXECUTE'),
     has_function_privilege('anon','public.finalize_live_course_checkout(uuid,text,uuid,text,text,timestamptz)','EXECUTE'),
     has_function_privilege('authenticated','public.recycle_expired_live_course_checkout(uuid,text,uuid,text)','EXECUTE')
    """).fetchone()
    assert acl==(False,False,True,False,False),acl
    assert conn.execute("SELECT relrowsecurity FROM pg_class WHERE oid='internal.live_course_checkout_reservations'::regclass").fetchone()[0]
print("PASS migration applies; private RLS reservations; RPCs accessible only to service_role")

buyer=uid()
with db() as conn: conn.execute("INSERT INTO auth.users(id) VALUES(%s)",(buyer,))
outcomes=[]
barrier=threading.Barrier(2)
def compete():
    try:
        with db() as conn:
            barrier.wait(timeout=5)
            outcomes.append(reserve(conn,buyer))
    except Exception as e: outcomes.append({"error":str(e)})
t1,t2=threading.Thread(target=compete),threading.Thread(target=compete)
t1.start();t2.start();t1.join(10);t2.join(10)
assert not t1.is_alive() and not t2.is_alive(),outcomes
assert sorted(x.get("result") for x in outcomes)==["create_once","pending"],outcomes
created=next(x for x in outcomes if x["result"]=="create_once")
key=created["reservation_key"]
assert key and created["consent_recorded_at"]
with db() as conn:
    assert rows(conn,buyer)==1
    assert reserve(conn,buyer)["result"]=="pending"
print("PASS two genuine PostgreSQL connections permit exactly one new Stripe session attempt")

with db() as conn:
    conn.execute("UPDATE internal.live_course_checkout_reservations SET leased_until=clock_timestamp()-interval '1 second' WHERE user_id=%s",(buyer,))
    retried=reserve(conn,buyer)
    assert retried["result"]=="create_once" and retried["reservation_key"]==key
    assert retried["consent_recorded_at"]==created["consent_recorded_at"]
print("PASS expired lease retries identical idempotency key and consent timestamp")

sid="cs_live_qa_fixture_one"
with db() as conn:
    assert finalize(conn,buyer,str(uuid.uuid4()),sid)["result"]=="conflict"
    assert finalize(conn,buyer,key,sid)["result"]=="open"
    assert finalize(conn,buyer,key,sid)["result"]=="open"
    assert reserve(conn,buyer)["result"]=="open"
    assert reserve(conn,buyer)["url"]=="https://checkout.stripe.com/c/pay/fixture"
    assert rows(conn,buyer)==1
print("PASS only matching reservation can finalize; repeated use returns one URL")

# Old Stripe session must be explicitly reconciled as expired & unpaid by handler
# before calling recycle; the DB checks row identity, ownership and expiry.
with db() as conn:
    conn.execute("UPDATE internal.live_course_checkout_reservations SET stripe_expires_at=clock_timestamp()-interval '1 second' WHERE user_id=%s",(buyer,))
    previous=reserve(conn,buyer)
    assert previous["result"]=="reconcile" and previous["stripe_session_id"]==sid
    wrong=conn.execute("SELECT public.recycle_expired_live_course_checkout(%s,%s,%s,%s)",
      (buyer,COURSE,str(uuid.uuid4()),sid)).fetchone()[0]
    assert wrong["result"]=="conflict"
    new=conn.execute("SELECT public.recycle_expired_live_course_checkout(%s,%s,%s,%s)",
      (buyer,COURSE,key,sid)).fetchone()[0]
    assert new["result"]=="create_once" and new["reservation_key"]!=key
    assert rows(conn,buyer)==1
    assert reserve(conn,buyer)["result"]=="pending"
print("PASS expired unpaid session can be recycled once; wrong key cannot recycle")

with db() as conn:
    conn.execute("INSERT INTO public.purchase_confirmations(user_id,course_id,stripe_checkout_session_id) VALUES(%s,%s,%s)",
      (buyer,COURSE,"cs_live_paid_order"))
    assert reserve(conn,buyer)["result"]=="owned"
    assert finalize(conn,buyer,new["reservation_key"],"cs_live_second_session")["result"]=="owned"
print("PASS existing paid receipt wins over an outstanding checkout reservation")

other=uid()
with db() as conn:
    conn.execute("INSERT INTO auth.users(id) VALUES(%s)",(other,))
    first=reserve(conn,other)
    assert first["result"]=="create_once"
    conn.execute("UPDATE internal.live_course_checkout_reservations SET leased_until=clock_timestamp()-interval '1 second',attempt_created_at=clock_timestamp()-interval '21 minutes' WHERE user_id=%s",(other,))
    result=reserve(conn,other)
    assert result["result"]=="reconcile"
    assert rows(conn,other)==1
print("PASS unknown Stripe outcome older than safe retry window fails closed")

with db() as conn:
    assert reserve(conn,None)["result"]=="invalid"
    assert conn.execute("SELECT public.reserve_live_course_checkout(%s,%s)",(other,"other-course")).fetchone()[0]["result"]=="invalid"
print("PASS disallows invalid buyers and unrelated courses")
print("ALL STAGED LIVE CHECKOUT RESERVATION TESTS PASSED")

"""Real two-connection tests of the deployed SQL migration in DISPOSABLE PostgreSQL.
Requires a fresh local CI PostgreSQL, never the Supabase production DATABASE_URL.
No Stripe API calls, purchases, network emails or changes to customer data.
"""
import os
import pathlib
import threading
import time
import uuid
import psycopg

dsn = os.environ["DATABASE_URL"]
assert "disposable" in dsn and "localhost" in dsn, "Refuse non-disposable database"
source = pathlib.Path("supabase/migrations/20261123181441_grant_verified_live_course_before_email_delivery.sql").read_text()
assert "grant_verified_live_course_on_receipt" in source

def db():
    conn = psycopg.connect(dsn, connect_timeout=5)
    conn.execute("SET lock_timeout='5s'")
    return conn

def new_id():
    return str(uuid.uuid4())

def insert_order(conn, session, buyer, *, price=999, currency="gbp", course="beginner-training-course", terms="2026-11-21-course-v1", on_conflict=False):
    q = """INSERT INTO public.purchase_confirmations
           (stripe_checkout_session_id,user_id,course_id,paid_amount_pence,currency,terms_version)
           VALUES (%s,%s,%s,%s,%s,%s)"""
    if on_conflict:
        q += " ON CONFLICT (stripe_checkout_session_id) DO NOTHING"
    return conn.execute(q, (session,buyer,course,price,currency,terms))

def count(conn, table, clause="TRUE", params=()):
    return conn.execute("SELECT count(*) FROM " + table + " WHERE " + clause, params).fetchone()[0]

with db() as conn:
    for role in ("anon", "authenticated", "service_role"):
        conn.execute("CREATE ROLE " + role + " NOLOGIN")
    conn.execute("CREATE SCHEMA internal")
    conn.execute("""CREATE TABLE public.purchase_confirmations(
        stripe_checkout_session_id text PRIMARY KEY, user_id uuid NOT NULL, course_id text NOT NULL,
        paid_amount_pence integer NOT NULL, currency text NOT NULL, terms_version text NOT NULL,
        confirmation_email_status text NOT NULL DEFAULT 'pending')""")
    conn.execute("""CREATE TABLE public.course_access(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, course_id text NOT NULL,
        stripe_checkout_session_id text, UNIQUE (user_id,course_id),
        UNIQUE (stripe_checkout_session_id))""")
    conn.execute("ALTER TABLE public.purchase_confirmations ENABLE ROW LEVEL SECURITY")
    conn.execute("ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY")
    conn.execute("GRANT INSERT ON public.purchase_confirmations TO authenticated")
    conn.execute("GRANT USAGE ON SCHEMA internal TO authenticated")
    conn.execute(source)
print("PASS actual migration applied to fresh disposable PostgreSQL")

buyer = new_id()
with db() as conn:
    insert_order(conn,"cs_live_fixture_first",buyer)
    assert count(conn,"public.course_access","user_id=%s AND stripe_checkout_session_id=%s",(buyer,"cs_live_fixture_first")) == 1
    assert conn.execute("SELECT confirmation_email_status FROM public.purchase_confirmations WHERE stripe_checkout_session_id=%s",("cs_live_fixture_first",)).fetchone()[0] == "pending"
print("PASS verified-looking receipt grants before any email-provider acceptance")

for suffix,opts in [
    ("wrong_price",{"price":998}),
    ("wrong_currency",{"currency":"usd"}),
    ("wrong_course",{"course":"other-course"}),
    ("wrong_terms",{"terms":"sandbox-test"}),
    ("test_mode",{}),
]:
    identity = new_id()
    session = ("cs_test_" if suffix=="test_mode" else "cs_live_") + suffix
    with db() as conn:
        insert_order(conn,session,identity,**opts)
        assert count(conn,"public.course_access","user_id=%s",(identity,))==0, suffix
print("PASS invalid price/currency/course/terms/test-mode give no entitlement")

upgrade = new_id()
with db() as conn:
    conn.execute("INSERT INTO public.course_access(user_id,course_id,stripe_checkout_session_id) VALUES (%s,'beginner-training-course','cs_test_previous')",(upgrade,))
    insert_order(conn,"cs_live_upgrade",upgrade)
    assert count(conn,"public.course_access","user_id=%s AND stripe_checkout_session_id='cs_live_upgrade'",(upgrade,))==1
print("PASS previous sandbox entitlement upgrades to verified live entitlement")

with db() as conn:
    insert_order(conn,"cs_live_fixture_first",buyer,on_conflict=True)
    assert count(conn,"public.purchase_confirmations","stripe_checkout_session_id='cs_live_fixture_first'")==1
    assert count(conn,"public.course_access","user_id=%s",(buyer,))==1
print("PASS replayed receipt remains idempotent")

a,b=db(),db()
try:
    simultaneous = new_id()
    session = "cs_live_double_delivery"
    insert_order(a,session,simultaneous,on_conflict=True)
    result={}
    started=threading.Event()
    def contender():
        try:
            started.set()
            insert_order(b,session,simultaneous,on_conflict=True)
            b.commit()
            result["ok"]=True
        except Exception as exc:
            result["error"]=str(exc)
            b.rollback()
    worker=threading.Thread(target=contender)
    worker.start()
    assert started.wait(2)
    time.sleep(0.3)
    assert worker.is_alive(), "Second connection should wait for first transaction"
    a.commit()
    worker.join(5)
    assert not worker.is_alive() and result.get("ok"), result
    with db() as conn:
        assert count(conn,"public.purchase_confirmations","stripe_checkout_session_id=%s",(session,))==1
        assert count(conn,"public.course_access","user_id=%s",(simultaneous,))==1
finally:
    a.close()
    b.close()
print("PASS two actual PostgreSQL connections safely handle a duplicate receipt")

dual_buyer = new_id()
barrier = threading.Barrier(2)
outcomes=[]
def concurrent_distinct(session):
    try:
        with db() as conn:
            barrier.wait(timeout=5)
            insert_order(conn,session,dual_buyer)
        outcomes.append("ok")
    except Exception as exc:
        outcomes.append("error:"+str(exc))
t1=threading.Thread(target=concurrent_distinct,args=("cs_live_parallel_a",))
t2=threading.Thread(target=concurrent_distinct,args=("cs_live_parallel_b",))
t1.start()
t2.start()
t1.join(8)
t2.join(8)
assert not t1.is_alive() and not t2.is_alive() and sorted(outcomes)==["ok","ok"],outcomes
with db() as conn:
    assert count(conn,"public.purchase_confirmations","user_id=%s",(dual_buyer,))==2
    assert count(conn,"public.course_access","user_id=%s",(dual_buyer,))==1
print("PASS competing distinct paid sessions create only one course entitlement")

with db() as conn:
    rights=conn.execute("""SELECT
       has_function_privilege('anon','internal.grant_verified_live_course_on_receipt()','EXECUTE'),
       has_function_privilege('authenticated','internal.grant_verified_live_course_on_receipt()','EXECUTE')""").fetchone()
    assert rights==(False,False),rights
    assert conn.execute("SELECT relrowsecurity FROM pg_class WHERE oid='public.purchase_confirmations'::regclass").fetchone()[0] is True
    assert conn.execute("SELECT relrowsecurity FROM pg_class WHERE oid='public.course_access'::regclass").fetchone()[0] is True
print("PASS internal trigger function forbidden to anonymous/authenticated callers; both tables have RLS")
print("ALL DISPOSABLE TWO-CONNECTION COURSE UNLOCK TESTS PASSED")

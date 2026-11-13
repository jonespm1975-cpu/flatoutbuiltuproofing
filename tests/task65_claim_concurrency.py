"""Isolated two-connection PostgreSQL test. Requires disposable DATABASE_URL and psycopg 3."""
import os, pathlib, threading, time
import psycopg

dsn=os.environ["DATABASE_URL"]
source=pathlib.Path("proposals/task-59-sandbox-single-session-claim.sql").read_text()
sid="cs_test_task65_disposable"
def db(): return psycopg.connect(dsn)

with db() as conn:
    conn.execute("CREATE ROLE anon NOLOGIN")
    conn.execute("CREATE ROLE authenticated NOLOGIN")
    conn.execute("CREATE ROLE service_role NOLOGIN")
    conn.execute("CREATE TABLE public.purchase_confirmations(stripe_checkout_session_id text primary key,terms_version text not null,confirmation_email_status text not null)")
    conn.execute("""CREATE TABLE public.sandbox_email_retry_queue(
        stripe_checkout_session_id text primary key references public.purchase_confirmations,
        status text not null default 'pending', attempts integer not null default 0,
        next_attempt_at timestamptz not null default now(),
        lease_until timestamptz,lease_token uuid,updated_at timestamptz not null default now())""")
    conn.execute(source)
    conn.execute("INSERT INTO public.purchase_confirmations VALUES (%s,'sandbox-test','pending')",(sid,))
    conn.execute("INSERT INTO public.sandbox_email_retry_queue(stripe_checkout_session_id,next_attempt_at) VALUES (%s,now()-interval '1 minute')",(sid,))

a,b=db(),db()
try:
    a.execute("SELECT * FROM public.claim_sandbox_confirmation_for_session(%s)",(sid,))
    first=a.fetchall()
    assert len(first)==1 and first[0][1]==1 and first[0][2] is not None, first
    result={}
    def competing_claim():
        started=time.monotonic()
        b.execute("SET LOCAL lock_timeout='2s'")
        b.execute("SELECT * FROM public.claim_sandbox_confirmation_for_session(%s)",(sid,))
        result["rows"]=b.fetchall()
        result["seconds"]=time.monotonic()-started
        b.rollback()
    thread=threading.Thread(target=competing_claim)
    thread.start()
    thread.join(5)
    assert not thread.is_alive(), "Competing connection blocked"
    assert result["rows"]==[] and result["seconds"]<2, result
    print("PASS: separate connection skipped locked row")
    a.commit()
    b.execute("SELECT * FROM public.claim_sandbox_confirmation_for_session(%s)",(sid,))
    assert b.fetchall()==[], "Duplicate claim on active lease"
    b.rollback()
    print("PASS: committed lease prevented duplicate claim")
    with db() as c:
        c.execute("UPDATE public.sandbox_email_retry_queue SET lease_until=now()-interval '1 minute' WHERE stripe_checkout_session_id=%s",(sid,))
    b.execute("SELECT * FROM public.claim_sandbox_confirmation_for_session(%s)",(sid,))
    renewed=b.fetchall()
    assert len(renewed)==1 and renewed[0][1]==2 and renewed[0][2]!=first[0][2],renewed
    b.commit()
    print("PASS: expired lease reclaimed with new token")
    with db() as c:
        c.execute("""SELECT has_function_privilege('anon','public.claim_sandbox_confirmation_for_session(text)','EXECUTE'),
        has_function_privilege('authenticated','public.claim_sandbox_confirmation_for_session(text)','EXECUTE'),
        has_function_privilege('service_role','public.claim_sandbox_confirmation_for_session(text)','EXECUTE')""")
        assert c.fetchone()==(False,False,True), "Unexpected function grants"
    print("PASS: service role only")
finally:
    a.close()
    b.close()

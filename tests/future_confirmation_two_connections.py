"""Actual STAGED future-contract-confirmation migration, disposable Postgres 16 only.
No production connection, real buyer, charge or email provider requests.
"""
import os, threading, uuid
from datetime import datetime,timezone,timedelta
from pathlib import Path
import psycopg

dsn=os.environ["DATABASE_URL"]
assert "disposable" in dsn and "localhost" in dsn, "Refuse non-local database"
migration=Path("supabase/migrations/20261123202000_future_contract_confirmation_queue.sql").read_text()
def db():
  c=psycopg.connect(dsn,connect_timeout=5)
  c.execute("SET lock_timeout='8s'")
  return c
def newid():return str(uuid.uuid4())
def count(c):
 return c.execute("select count(*) from internal.future_contract_confirmation_jobs").fetchone()[0]
def receipt(c,buyer,session,**overrides):
 args=dict(course_id="beginner-training-course",paid_amount_pence=999,currency="gbp",
  terms_version="2026-11-21-course-v1",confirmation_email_status="pending")
 args.update(overrides)
 c.execute("""INSERT INTO public.purchase_confirmations
 (stripe_checkout_session_id,user_id,course_id,paid_amount_pence,currency,
  consent_recorded_at,confirmed_at,terms_version,confirmation_email_status)
 VALUES (%s,%s,%s,%s,%s,now(),now(),%s,%s)""",
 (session,buyer,args["course_id"],args["paid_amount_pence"],args["currency"],
 args["terms_version"],args["confirmation_email_status"]))
def claim(c):
 return c.execute("select * from public.claim_future_contract_confirmations(1)").fetchall()
def finish(c,s,t,outcome,message=None):
 return c.execute("select public.finish_future_contract_confirmation(%s,%s,%s,%s,%s)",
    (s,t,outcome,message,None)).fetchone()[0]

history=newid()
buyer=newid()
with db() as c:
 for role in ("anon","authenticated","service_role"):
  c.execute("create role "+role+" nologin")
 c.execute("create schema auth")
 c.execute("create schema internal")
 c.execute("create table auth.users(id uuid primary key,email text)")
 c.execute("""CREATE TABLE public.purchase_confirmations(
  stripe_checkout_session_id text primary key,user_id uuid not null,course_id text not null,
  paid_amount_pence integer not null,currency text not null,
  consent_recorded_at timestamptz not null,confirmed_at timestamptz not null,
  terms_version text not null,confirmation_email_status text not null default 'pending')""")
 c.execute("""create table internal.live_purchase_email_outbox(
  stripe_checkout_session_id text primary key,status text not null)""")
 c.execute("insert into auth.users values(%s,%s),(%s,%s)",
   (history,"previous@example.invalid",buyer,"course-account@example.invalid"))
 receipt(c,history,"cs_live_historical_accepted")
 c.execute("insert into internal.live_purchase_email_outbox values (%s,'accepted')",
   ("cs_live_historical_accepted",))
 c.execute(migration)
 assert count(c)==0, "Historical paid orders must NEVER be backfilled"
 a=c.execute("""SELECT
  has_function_privilege('anon','public.claim_future_contract_confirmations(integer)','EXECUTE'),
  has_function_privilege('authenticated','public.claim_future_contract_confirmations(integer)','EXECUTE'),
  has_function_privilege('service_role','public.claim_future_contract_confirmations(integer)','EXECUTE'),
  has_function_privilege('anon','public.finish_future_contract_confirmation(text,uuid,text,text,text)','EXECUTE')""").fetchone()
 assert a==(False,False,True,False),a
 assert c.execute("select relrowsecurity from pg_class where oid='internal.future_contract_confirmation_jobs'::regclass").fetchone()[0]
 print("PASS private RLS/ACL; historical accepted email never backfilled")

with db() as c:
 receipt(c,buyer,"cs_live_disposable_new")
 assert count(c)==1
 c.execute("insert into internal.live_purchase_email_outbox values (%s,'pending')",("cs_live_disposable_new",))
 for postfix,overrides in [
  ("bad_price",dict(paid_amount_pence=998)),
  ("test_mode",dict()),
  ("bad_course",dict(course_id="other-course")),
  ("bad_terms",dict(terms_version="sandbox-test")),
  ("already_sent",dict(confirmation_email_status="sent")),
  ("bad_currency",dict(currency="usd")),
 ]:
  identity=newid()
  c.execute("insert into auth.users values(%s,%s)",(identity,identity+"@example.invalid"))
  sid=("cs_test_" if postfix=="test_mode" else "cs_live_")+postfix
  receipt(c,identity,sid,**overrides)
 assert count(c)==1
 print("PASS queues only future £9.99 live, consented pending-contract records")

barrier=threading.Barrier(2)
results=[]
def contender():
 try:
  with db() as c:
   barrier.wait(timeout=5)
   results.append(claim(c))
 except Exception as e:
  results.append({"error":str(e)})
a,b=threading.Thread(target=contender),threading.Thread(target=contender)
a.start();b.start();a.join(10);b.join(10)
assert not a.is_alive() and not b.is_alive(),results
assert sum(len(x) for x in results if isinstance(x,list))==1,results
one=next(x[0] for x in results if isinstance(x,list) and x)
assert one[0]=="cs_live_disposable_new",one
assert one[2]=="course-account@example.invalid",one
assert one[3]=="beginner-training-course" and one[4]==999,one
sid,token=one[0],one[1]
print("PASS two genuine connections claim at most one job and use Supabase account email")

with db() as c:
 assert claim(c)==[],"Leased job must not be automatically re-claimed"
 assert finish(c,sid,str(uuid.uuid4()),"accepted","other") is False
 assert finish(c,sid,token,"accepted",None) is False
 assert finish(c,sid,token,"accepted","provider_message_fixture") is True
 assert finish(c,sid,token,"accepted","provider_message_fixture") is False
 assert claim(c)==[]
 row=c.execute("""select status,attempts,provider_message_id,accepted_at
  from internal.future_contract_confirmation_jobs where stripe_checkout_session_id=%s""",(sid,)).fetchone()
 assert row[0]=="accepted" and row[1]==1 and row[2]=="provider_message_fixture" and row[3]
 print("PASS accepted provider ID stored only once, wrong/duplicate completion refused")

with db() as c:
 other=newid()
 c.execute("insert into auth.users values (%s,%s)",(other,"another@example.invalid"))
 receipt(c,other,"cs_live_disposable_ambiguous")
 lease=claim(c)
 assert len(lease)==1
 assert finish(c,lease[0][0],lease[0][1],"review") is True
 assert claim(c)==[]
 review=c.execute("""select status,attempts from internal.future_contract_confirmation_jobs
 where stripe_checkout_session_id='cs_live_disposable_ambiguous'""").fetchone()
 assert review==("review",1)
 print("PASS ambiguous outcome requires review with no automatic retry")

with db() as c:
 older=newid()
 c.execute("insert into auth.users values (%s,%s)",(older,"accepted-old@example.invalid"))
 receipt(c,older,"cs_live_disposable_previous_provider")
 c.execute("insert into internal.live_purchase_email_outbox values (%s,'accepted')",("cs_live_disposable_previous_provider",))
 assert claim(c)==[], "Old accepted provider row must block new provider send"
 print("PASS legacy accepted records cannot be sent again through the new worker")

with db() as c:
 one_more=newid()
 c.execute("insert into auth.users values (%s,%s)",(one_more,"timed-out@example.invalid"))
 receipt(c,one_more,"cs_live_disposable_lease_expired")
 claimed=claim(c)
 assert len(claimed)==1
 c.execute("""update internal.future_contract_confirmation_jobs
 set lease_until=clock_timestamp()-interval '1 second'
 where stripe_checkout_session_id='cs_live_disposable_lease_expired'""")
 assert claim(c)==[],"Expired lease may not cause automatic resend"
 assert finish(c,claimed[0][0],claimed[0][1],"accepted","late-id") is False
 print("PASS expired leased job fails closed instead of resending")

print("ALL TWO-CONNECTION FUTURE CONFIRMATION TESTS PASSED")

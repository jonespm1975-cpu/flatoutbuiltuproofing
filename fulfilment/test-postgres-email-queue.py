"""REAL two-connection PostgreSQL queue test, disposable CI only. No provider API."""
import os
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from datetime import datetime,timedelta,timezone
from uuid import uuid4
import psycopg

DB=os.environ["CI_POSTGRES_URL"]
now=datetime(2026,11,22,tzinfo=timezone.utc)
def query(sql,params=()):
 with psycopg.connect(DB,autocommit=True,connect_timeout=10) as db:
  cursor=db.execute(sql,params)
  return cursor.fetchall() if cursor.description is not None else []
def claim(token,ts=now,barrier=None,limit=1):
 with psycopg.connect(DB,autocommit=True,connect_timeout=10) as db:
  if barrier:barrier.wait(timeout=15)
  return db.execute("SELECT * FROM ci_fulfilment.claim_email_jobs(%s,%s,%s)",(ts,token,limit)).fetchall()
def finish(session,token,ts=now,ok=True,provider="provider_001",error=None):
 return query("SELECT ci_fulfilment.finish_email_job(%s,%s,%s,%s,%s,%s)",
              (session,token,ts,ok,provider if ok else None,error))[0][0]

# The 49 receipts and 49 entitlements from the earlier two tests MUST remain
# intact even if every subsequent email operation fails.
base=query("SELECT (SELECT count(*) FROM ci_fulfilment.receipts), (SELECT count(*) FROM ci_fulfilment.entitlements)")[0]
assert base==(49,49),base
# Put all jobs into accepted except a single candidate: two real connections
# will contend for EXACTLY the same eligible job.
query("UPDATE ci_fulfilment.email_jobs SET status='accepted',provider_id='provider_prior'")
session=query("SELECT session_id FROM ci_fulfilment.email_jobs ORDER BY session_id LIMIT 1")[0][0]
query("UPDATE ci_fulfilment.email_jobs SET status='pending',provider_id=NULL WHERE session_id=%s",(session,))
barrier=Barrier(2)
t1,t2=uuid4(),uuid4()
with ThreadPoolExecutor(max_workers=2) as executor:
 f1=executor.submit(claim,t1,now,barrier)
 f2=executor.submit(claim,t2,now,barrier)
 a,b=f1.result(timeout=30),f2.result(timeout=30)
assert sorted([len(a),len(b)])==[0,1],(a,b)
winner=(a or b)[0]
assert winner[0]==session
assert claim(uuid4())==[],"active lease must not be claimed"
assert not finish(session,(t2 if a else t1),now),"wrong token cannot finish"
assert finish(session,winner[1],now,True,"resend-accepted-ci"),"accepted provider claim"
assert not finish(session,winner[1],now),"accepted record cannot be replayed"
assert claim(uuid4())==[],"accepted cannot be re-sent"
assert query("SELECT status,provider_id FROM ci_fulfilment.email_jobs WHERE session_id=%s",(session,))==[("accepted","resend-accepted-ci")]
# Independently granted paid access MUST persist if the email provider is down.
second=query("SELECT session_id FROM ci_fulfilment.email_jobs WHERE session_id<>%s ORDER BY session_id LIMIT 1",(session,))[0][0]
query("UPDATE ci_fulfilment.email_jobs SET status='pending',provider_id=NULL WHERE session_id=%s",(second,))
token=uuid4();j=claim(token)
assert len(j)==1 and j[0][0]==second
assert finish(second,token,now,False,error="provider_unavailable")
assert query("SELECT status,attempts FROM ci_fulfilment.email_jobs WHERE session_id=%s",(second,))==[("pending",1)]
assert claim(uuid4(),now)==[],"backoff must prevent immediate retry"
retry_at=now+timedelta(minutes=2)
token2=uuid4();j=claim(token2,retry_at)
assert len(j)==1 and j[0][0]==second and j[0][2]==2
assert not finish(second,token,retry_at,True,"late_provider_id"),"stale token must fail"
assert finish(second,token2,retry_at,True,"resend-after-retry")
# Simulate an expired lease; only a new token may finish after re-claim.
third=query("SELECT session_id FROM ci_fulfilment.email_jobs WHERE session_id NOT IN (%s,%s) ORDER BY session_id LIMIT 1",(session,second))[0][0]
query("UPDATE ci_fulfilment.email_jobs SET status='pending',provider_id=NULL WHERE session_id=%s",(third,))
old=uuid4();assert claim(old,retry_at)[0][0]==third
expired=retry_at+timedelta(seconds=61)
new=uuid4();assert claim(new,expired)[0][0]==third
assert not finish(third,old,expired,True,"old_accepted")
assert finish(third,new,expired,True,"provider_new")
# 4 errors must terminate retries, preserving access and avoiding infinite sends.
fourth=query("SELECT session_id FROM ci_fulfilment.email_jobs WHERE session_id NOT IN (%s,%s,%s) ORDER BY session_id LIMIT 1",(session,second,third))[0][0]
query("UPDATE ci_fulfilment.email_jobs SET status='pending',provider_id=NULL WHERE session_id=%s",(fourth,))
clock=now
for attempt in range(4):
 tk=uuid4();claimed=claim(tk,clock)
 assert len(claimed)==1 and claimed[0][0]==fourth,(attempt,claimed)
 assert finish(fourth,tk,clock,False,error="provider_timeout")
 clock+=timedelta(hours=1)
assert query("SELECT status,attempts FROM ci_fulfilment.email_jobs WHERE session_id=%s",(fourth,))==[("dead",4)]
assert claim(uuid4(),clock)==[],"dead letters must not be retried automatically"
assert query("SELECT (SELECT count(*) FROM ci_fulfilment.receipts), (SELECT count(*) FROM ci_fulfilment.entitlements)")[0]==base
assert query("SELECT count(*) FROM ci_fulfilment.email_jobs")[0][0]==49
print("PASS: two real DB connections, exclusive lease, wrong/stale tokens, provider rejection/backoff, expiry, dead letter, one per-session job, paid access survives outage.")

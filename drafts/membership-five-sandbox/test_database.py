import os
import subprocess
from concurrent.futures import ThreadPoolExecutor
import json

ENV = dict(os.environ, PGHOST="127.0.0.1", PGPORT="5432", PGUSER="postgres", PGPASSWORD="disposable-only", PGDATABASE="postgres")
def sql(q):
    return subprocess.check_output(["psql","-X","-v","ON_ERROR_STOP=1","-Atq","-c",q],env=ENV,text=True).strip()
def check(name, actual, expected):
    assert actual == expected, (name,actual,expected)
    print("PASS:",name,flush=True)
sql("""create role anon; create role authenticated; create role service_role;
create schema internal;
create schema auth;
create table auth.users(id uuid primary key);
create table public.membership_subscriptions(stripe_subscription_id text primary key,user_id uuid not null references auth.users(id),stripe_customer_id text not null,stripe_price_id text not null,status text not null,current_period_end timestamptz not null,cancel_at_period_end boolean not null,last_stripe_event_created bigint not null,updated_at timestamptz not null,livemode boolean not null);
insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');""")
subprocess.run(["psql","-X","-v","ON_ERROR_STOP=1","-f","drafts/membership-five-sandbox/database-DRAFT.sql"],env=ENV,check=True)
u="11111111-1111-4111-8111-111111111111"
v="22222222-2222-4222-8222-222222222222"
def claim(i):
    return sql(f"select public.claim_membership_five_test_checkout('{u}','00000000-0000-4000-8000-{i:012d}');")
with ThreadPoolExecutor(max_workers=8) as pool:
    results=list(pool.map(claim,range(1,9)))
check("eight separate connections: exactly one reservation",results.count("t"),1)
check("one reservation row",sql("select count(*) from internal.membership_five_test_checkout_leases"),"1")
sql("update internal.membership_five_test_checkout_leases set expires_at=now()-interval '1 second'")
check("expired reservation recoverable",claim(9),"t")
check("anonymous claim blocked",sql("select has_function_privilege('anon','public.claim_membership_five_test_checkout(uuid,uuid)','EXECUTE')"),"f")
check("authenticated event writer blocked",sql("select has_function_privilege('authenticated','public.apply_membership_five_test_event(jsonb)','EXECUTE')"),"f")
base=dict(stripe_price_id="price_1UfiBg3eiZFnd5l0Y7cs24MU",stripe_subscription_id="sub_fixture",stripe_customer_id="cus_fixture",user_id=u,status="active",current_period_end="2099-01-01T00:00:00Z",cancel_at_period_end=False,last_stripe_event_created=100)
def event(**kw):
    payload=json.dumps(dict(base,**kw))
    return sql("select public.apply_membership_five_test_event($json$"+payload+"$json$::jsonb)")
with ThreadPoolExecutor(max_workers=8) as pool:
    list(pool.map(lambda _:event(),range(8)))
check("concurrent event replay creates one row",sql("select count(*) from public.membership_subscriptions"),"1")
check("sandbox never recorded live",sql("select livemode from public.membership_subscriptions"),"f")
event(status="past_due",last_stripe_event_created=102)
event(status="active",last_stripe_event_created=101)
check("stale event cannot restore access",sql("select status from public.membership_subscriptions"),"past_due")
event(user_id=v,status="active",last_stripe_event_created=103)
check("ownership conflict cannot change status or owner",sql("select user_id::text||':'||status from public.membership_subscriptions"),u+":past_due")
event(status="canceled",last_stripe_event_created=104)
check("cancellation persisted",sql("select status from public.membership_subscriptions"),"canceled")
print("Disposable database checks complete. No production services contacted.")

"""Disposable PostgreSQL only. Actual deployed SQL snapshot, synthetic records."""
import os
import pathlib
import uuid
from datetime import datetime, timezone, timedelta
import psycopg
from psycopg.types.json import Jsonb

url=os.environ["DATABASE_URL"]
assert "localhost" in url and "disposable_membership" in url, "Refusing non-fixture database"
root=pathlib.Path(__file__).resolve().parents[1]
user=uuid.UUID("11111111-1111-4111-8111-111111111111")
other=uuid.UUID("22222222-2222-4222-8222-222222222222")
reservation=uuid.UUID("33333333-3333-4333-8333-333333333333")
price="price_1UeNy2KeIprRDTKxLWoER0vk"
expiry=datetime.now(timezone.utc)+timedelta(days=30)
version="membership-2026-11-24-v1"
def expect(actual,wanted,label):
    assert actual==wanted, f"{label}: {actual!r} != {wanted!r}"
    print("PASS",label,flush=True)
with psycopg.connect(url,autocommit=True) as db:
    db.execute("""
    create schema auth;
    create schema internal;
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.membership_subscriptions(
      stripe_subscription_id text primary key,user_id uuid not null,stripe_customer_id text not null,
      stripe_price_id text not null,status text not null,current_period_end timestamptz,
      cancel_at_period_end boolean,last_stripe_event_created bigint,updated_at timestamptz,livemode boolean);
    create table internal.live_membership_checkout_reservations(user_id uuid,reservation_key uuid primary key);
    create table internal.membership_contract_versions(version text primary key,approved_at timestamptz,terms_text text);
    create table internal.membership_contract_consents(reservation_key uuid primary key,user_id uuid,version text references internal.membership_contract_versions,consented_at timestamptz);
    create table internal.membership_confirmation_outbox(
      subscription_id text primary key references public.membership_subscriptions,
      invoice_id text not null unique,reservation_key uuid references internal.membership_contract_consents,
      recipient text,paid_pence integer check(paid_pence=500),currency text check(currency='gbp'),
      next_payment_at timestamptz,status text default 'pending',claim_token uuid,claimed_at timestamptz,
      provider_message_id text unique,completed_at timestamptz,created_at timestamptz default now());
    """)
    db.execute((root/"audits/membership-staged-source-2026-11-25/database-functions.sql").read_text())
    db.execute("insert into internal.live_membership_checkout_reservations values (%s,%s)",(user,reservation))
    db.execute("insert into internal.membership_contract_versions values (%s,now(),'Synthetic fixture terms')",(version,))
    db.execute("insert into internal.membership_contract_consents values (%s,%s,%s,now())",(reservation,user,version))
    db.execute("select set_config('request.jwt.claim.sub',%s,false)",(str(user),))
    active=lambda:db.execute("select public.has_active_membership()").fetchone()[0]
    expect(active(),False,"no subscription has no access")
    row=dict(user_id=str(user),reservation_key=str(reservation),stripe_subscription_id="sub_fixture",
        stripe_customer_id="cus_fixture",stripe_price_id=price,status="active",current_period_end=expiry.isoformat(),
        cancel_at_period_end=False,last_stripe_event_created=100)
    def apply(changes=None,invoice=None):
        return db.execute("select public.apply_membership_event_and_confirmation(%s,%s,%s)",
            (Jsonb({**row,**(changes or {})}),invoice,"customer@fixture.invalid" if invoice else None)).fetchone()[0]
    expect(apply(invoice="in_fixture"),True,"first invoice and entitlement written together")
    expect(active(),True,"active unexpired membership grants access")
    expect(apply(invoice="in_fixture"),True,"duplicate invoice replay accepted")
    expect(db.execute("select count(*) from internal.membership_confirmation_outbox").fetchone()[0],1,"one confirmation despite duplicate event")
    db.execute("select set_config('request.jwt.claim.sub',%s,false)",(str(other),))
    expect(active(),False,"another account cannot access entitlement")
    db.execute("select set_config('request.jwt.claim.sub',%s,false)",(str(user),))
    expect(apply({"cancel_at_period_end":True,"last_stripe_event_created":101}),True,"scheduled cancellation applied")
    expect(active(),True,"scheduled cancellation retains paid period access")
    expect(apply({"status":"past_due","last_stripe_event_created":102}),True,"failed renewal recorded")
    expect(active(),False,"past due membership denied")
    expect(apply({"last_stripe_event_created":101}),True,"stale event ignored")
    expect(active(),False,"stale paid event cannot restore access")
    expect(apply({"last_stripe_event_created":103}),True,"newer paid event restores status")
    expect(active(),True,"newer paid event restores access")
    expect(apply({"current_period_end":(expiry-timedelta(days=60)).isoformat(),"last_stripe_event_created":104}),True,"expired period recorded")
    expect(active(),False,"expired active record denied")
    expect(apply({"status":"canceled","last_stripe_event_created":105}),True,"cancellation applied")
    expect(active(),False,"cancelled membership denied")
    expect(db.execute("select count(*) from internal.membership_confirmation_outbox").fetchone()[0],1,"renewals do not duplicate confirmation")
    with psycopg.connect(url) as first, psycopg.connect(url) as second:
        first.execute("set local statement_timeout='3s'")
        second.execute("set local statement_timeout='3s'")
        claimed=first.execute("select * from public.claim_membership_confirmation(1)").fetchall()
        expect(len(claimed),1,"first worker claims one job")
        expect(len(second.execute("select * from public.claim_membership_confirmation(1)").fetchall()),0,"second connection skips locked job")
        second.commit()
        token=claimed[0][-1]
        first.commit()
    expect(db.execute("select count(*) from public.claim_membership_confirmation(1)").fetchone()[0],0,"committed claim cannot be duplicated")
    expect(db.execute("select public.finish_membership_confirmation('sub_fixture',%s,'accepted','fixture-id')",(uuid.uuid4(),)).fetchone()[0],False,"wrong claim token refused")
    expect(db.execute("select public.finish_membership_confirmation('sub_fixture',%s,'accepted','fixture-id')",(token,)).fetchone()[0],True,"correct claim finalizes job")
    expect(db.execute("select public.finish_membership_confirmation('sub_fixture',%s,'accepted','fixture-id')",(token,)).fetchone()[0],False,"duplicate completion refused")
    expect(db.execute("select status from internal.membership_confirmation_outbox").fetchone()[0],"accepted","provider acceptance not mislabelled delivered")
    # Candidate callback SQL: service-only, identity-bound, idempotent, bounce cannot be cleared.
    db.execute("create role anon; create role authenticated; create role service_role")
    db.execute((root/"proposals/membership-confirmation-delivery.sql").read_text())
    signature="public.record_membership_confirmation_delivery(text,text,text,timestamptz)"
    for role,allowed in [("anon",False),("authenticated",False),("service_role",True)]:
        expect(db.execute("select has_function_privilege(%s,%s,'EXECUTE')",(role,signature)).fetchone()[0],allowed,"callback execute privilege "+role)
    def callback(message="fixture-id",recipient="customer@fixture.invalid",kind="delivered",when=None):
        return db.execute("select public.record_membership_confirmation_delivery(%s,%s,%s,%s)",(message,recipient,kind,when or datetime.now(timezone.utc))).fetchone()[0]
    status=lambda:db.execute("select status from internal.membership_confirmation_outbox").fetchone()[0]
    expect(callback(message="unknown"),False,"unknown provider message refused")
    expect(callback(recipient="other@fixture.invalid"),False,"wrong recipient refused")
    expect(callback(kind="opened"),False,"unsupported callback refused")
    expect(callback(when=datetime.now(timezone.utc)-timedelta(days=46)),False,"stale callback refused")
    expect(status(),"accepted","invalid callback cannot change accepted state")
    expect(callback(),True,"matching delivery recorded")
    expect(status(),"delivered","delivery status updated")
    expect(callback(),True,"duplicate delivery safely acknowledged")
    expect(callback(kind="bounced"),True,"bounce recorded")
    expect(status(),"bounced","bounce status updated")
    expect(callback(),True,"late delivery safely acknowledged")
    expect(status(),"bounced","late delivery cannot erase bounce")
    expect(active(),False,"delivery callbacks never grant membership access")
print("ALL DISPOSABLE MEMBERSHIP DATABASE TESTS PASSED")

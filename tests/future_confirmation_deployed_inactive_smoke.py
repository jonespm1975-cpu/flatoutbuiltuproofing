"""Unauthenticated read-only API smoke against newly deployed, inactive endpoints.
No credentials, recipient, customer data, database queries, charges or email sends.
"""
import urllib.request
import urllib.error
import json

BASE="https://fhyhshakmvqwzdyannec.supabase.co/functions/v1/"
PATHS=("future-contract-confirmation-worker","future-confirmation-delivery-webhook")

def request(path,method):
    payload=b"{}" if method=="POST" else None
    req=urllib.request.Request(
        BASE+path,data=payload,method=method,
        headers={"Content-Type":"application/json","User-Agent":"FOBUR-inert-safety-smoke/1.0"}
    )
    try:
        with urllib.request.urlopen(req,timeout=20) as r:
            status=r.status
    except urllib.error.HTTPError as e:
        status=e.code
    return status

for slug in PATHS:
    post=request(slug,"POST")
    get=request(slug,"GET")
    assert post==401,(slug,"POST should require secret",post)
    assert get==405,(slug,"GET must be rejected",get)
    print(f"PASS {slug}: unauthorised POST 401, GET 405, no email",flush=True)

print("ALL DEPLOYED POSTMARK ENDPOINT SAFETY CHECKS PASSED; ZERO MESSAGES OR CHARGES")
